package grpcserver

import (
	"context"
	"errors"
	"net"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"easy-devops-tutorial/service-b/internal/model"
	pb "easy-devops-tutorial/service-b/pb"
)

const bufSize = 1024 * 1024

func testDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&model.User{}); err != nil {
		t.Fatal(err)
	}
	return db
}

type mockPublisher struct {
	calls int
	err   error
}

func (m *mockPublisher) PublishUserCreated(ctx context.Context, userID, username, email string) error {
	m.calls++
	return m.err
}

func dialBuf(t *testing.T, lis *bufconn.Listener) pb.UserServiceClient {
	t.Helper()
	//nolint:staticcheck // SA1019: DialContext remains supported for grpc-go 1.x test dialers.
	conn, err := grpc.DialContext(context.Background(), "bufnet",
		grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
			return lis.Dial()
		}),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = conn.Close() })
	return pb.NewUserServiceClient(conn)
}

func TestGetUser_notFound(t *testing.T) {
	lis := bufconn.Listen(bufSize)
	db := testDB(t)
	s := grpc.NewServer()
	pb.RegisterUserServiceServer(s, NewUserServer(db, nil))
	go func() { _ = s.Serve(lis) }()
	t.Cleanup(func() { s.Stop() })

	client := dialBuf(t, lis)
	_, err := client.GetUser(context.Background(), &pb.GetUserRequest{Id: "missing"})
	if err == nil {
		t.Fatal("expected error")
	}
	st, ok := status.FromError(err)
	if !ok || st.Code() != codes.NotFound {
		t.Fatalf("got %v", err)
	}
}

func TestGetUser_invalid(t *testing.T) {
	lis := bufconn.Listen(bufSize)
	db := testDB(t)
	s := grpc.NewServer()
	pb.RegisterUserServiceServer(s, NewUserServer(db, nil))
	go func() { _ = s.Serve(lis) }()
	t.Cleanup(func() { s.Stop() })

	client := dialBuf(t, lis)
	_, err := client.GetUser(context.Background(), &pb.GetUserRequest{Id: ""})
	if err == nil {
		t.Fatal("expected error")
	}
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("code = %v", status.Code(err))
	}
}

func TestCreateUser_and_GetUser(t *testing.T) {
	lis := bufconn.Listen(bufSize)
	db := testDB(t)
	pub := &mockPublisher{}
	s := grpc.NewServer()
	pb.RegisterUserServiceServer(s, NewUserServer(db, pub))
	go func() { _ = s.Serve(lis) }()
	t.Cleanup(func() { s.Stop() })

	client := dialBuf(t, lis)
	created, err := client.CreateUser(context.Background(), &pb.CreateUserRequest{
		Username: "bob", Email: "bob@example.com",
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.Id == "" || created.Username != "bob" {
		t.Fatalf("unexpected user %+v", created)
	}
	if pub.calls != 1 {
		t.Fatalf("publisher calls = %d", pub.calls)
	}

	got, err := client.GetUser(context.Background(), &pb.GetUserRequest{Id: created.Id})
	if err != nil {
		t.Fatal(err)
	}
	if got.Email != "bob@example.com" {
		t.Fatalf("got %+v", got)
	}
}

func TestCreateUser_invalid(t *testing.T) {
	lis := bufconn.Listen(bufSize)
	db := testDB(t)
	s := grpc.NewServer()
	pb.RegisterUserServiceServer(s, NewUserServer(db, nil))
	go func() { _ = s.Serve(lis) }()
	t.Cleanup(func() { s.Stop() })

	client := dialBuf(t, lis)
	_, err := client.CreateUser(context.Background(), &pb.CreateUserRequest{Username: "", Email: "x"})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("got %v", err)
	}
}

func TestGetUser_databaseError(t *testing.T) {
	db := testDB(t)
	if err := db.Migrator().DropTable(&model.User{}); err != nil {
		t.Fatal(err)
	}
	s := NewUserServer(db, nil)
	_, err := s.GetUser(context.Background(), &pb.GetUserRequest{Id: "any-id"})
	if status.Code(err) != codes.Internal {
		t.Fatalf("expected Internal, got %v", err)
	}
}

func TestCreateUser_duplicate(t *testing.T) {
	db := testDB(t)
	s := NewUserServer(db, nil)
	ctx := context.Background()
	_, err := s.CreateUser(ctx, &pb.CreateUserRequest{Username: "dup", Email: "dup@x.com"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = s.CreateUser(ctx, &pb.CreateUserRequest{Username: "dup", Email: "dup@x.com"})
	if status.Code(err) != codes.Internal {
		t.Fatalf("expected Internal, got %v", err)
	}
}

func TestCreateUser_kafkaNonStrict_ignoresPublishError(t *testing.T) {
	t.Setenv("KAFKA_STRICT", "")

	lis := bufconn.Listen(bufSize)
	db := testDB(t)
	pub := &mockPublisher{err: errors.New("kafka unavailable")}
	s := grpc.NewServer()
	pb.RegisterUserServiceServer(s, NewUserServer(db, pub))
	go func() { _ = s.Serve(lis) }()
	t.Cleanup(func() { s.Stop() })

	client := dialBuf(t, lis)
	created, err := client.CreateUser(context.Background(), &pb.CreateUserRequest{
		Username: "z", Email: "z@z.com",
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.Id == "" {
		t.Fatal("expected user")
	}
}

func TestCreateUser_kafkaStrict(t *testing.T) {
	t.Setenv("KAFKA_STRICT", "1")

	lis := bufconn.Listen(bufSize)
	db := testDB(t)
	pub := &mockPublisher{err: errors.New("kafka down")}
	s := grpc.NewServer()
	pb.RegisterUserServiceServer(s, NewUserServer(db, pub))
	go func() { _ = s.Serve(lis) }()
	t.Cleanup(func() { s.Stop() })

	client := dialBuf(t, lis)
	_, err := client.CreateUser(context.Background(), &pb.CreateUserRequest{
		Username: "k", Email: "k@k.com",
	})
	if err == nil {
		t.Fatal("expected error")
	}
	if status.Code(err) != codes.Internal {
		t.Fatalf("got %v", err)
	}
}
