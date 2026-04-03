package grpcserver

import (
	"context"
	"errors"
	"net"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"
	"gorm.io/gorm"

	"easy-devops-tutorial/service-b/internal/auth"
	userv1 "easy-devops-tutorial/service-b/internal/genpb/user/v1"
	"easy-devops-tutorial/service-b/internal/grpcauth"
	"easy-devops-tutorial/service-b/internal/model"
)

const bufSize = 1024 * 1024

func adminUser(t *testing.T, db *gorm.DB) (id string) {
	t.Helper()
	h, err := auth.HashPassword("adminpass123")
	if err != nil {
		t.Fatal(err)
	}
	var rAdmin, rUser model.Role
	if err := db.Where("name = ?", model.RoleAdmin).First(&rAdmin).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Where("name = ?", model.RoleUser).First(&rUser).Error; err != nil {
		t.Fatal(err)
	}
	u := model.User{
		ID:           "admin-test-id",
		Username:     "admin",
		Email:        "admin@test",
		PasswordHash: h,
		Roles:        []model.Role{rUser, rAdmin},
	}
	if err := db.Create(&u).Error; err != nil {
		t.Fatal(err)
	}
	return u.ID
}

func ctxBearer(t *testing.T, signer *auth.JWTSigner, userID string, roles []string) context.Context {
	t.Helper()
	tok, _, err := signer.IssueAccessToken(userID, roles, time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	return metadata.NewOutgoingContext(context.Background(), metadata.Pairs("authorization", "Bearer "+tok))
}

type mockPublisher struct {
	calls int
	err   error
}

func (m *mockPublisher) PublishUserCreated(ctx context.Context, userID, username, email string) error {
	m.calls++
	return m.err
}

func dialUserClient(t *testing.T, lis *bufconn.Listener) userv1.UserServiceClient {
	t.Helper()
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
	return userv1.NewUserServiceClient(conn)
}

func startUserServer(t *testing.T, db *gorm.DB, pub UserEventPublisher) (*bufconn.Listener, *grpc.Server) {
	t.Helper()
	signer := auth.NewJWTSigner("test-secret", "", "")
	lis := bufconn.Listen(bufSize)
	s := grpc.NewServer(grpc.ChainUnaryInterceptor(AuthUnaryInterceptor(signer, PublicGRPCMethods())))
	userv1.RegisterUserServiceServer(s, NewUserServer(db, pub))
	go func() { _ = s.Serve(lis) }()
	t.Cleanup(func() { s.Stop() })
	return lis, s
}

func TestGetUser_notFound(t *testing.T) {
	db := openTestDB(t, "")
	uid := adminUser(t, db)
	lis, _ := startUserServer(t, db, nil)
	client := dialUserClient(t, lis)
	ctx := ctxBearer(t, auth.NewJWTSigner("test-secret", "", ""), uid, []string{model.RoleAdmin})

	_, err := client.GetUser(ctx, &userv1.GetUserRequest{Id: "missing"})
	if err == nil {
		t.Fatal("expected error")
	}
	if status.Code(err) != codes.NotFound {
		t.Fatalf("got %v", err)
	}
}

func TestGetUser_invalid(t *testing.T) {
	db := openTestDB(t, "")
	uid := adminUser(t, db)
	lis, _ := startUserServer(t, db, nil)
	client := dialUserClient(t, lis)
	ctx := ctxBearer(t, auth.NewJWTSigner("test-secret", "", ""), uid, []string{model.RoleAdmin})

	_, err := client.GetUser(ctx, &userv1.GetUserRequest{Id: ""})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("code = %v", status.Code(err))
	}
}

func TestCreateUser_and_GetUser(t *testing.T) {
	db := openTestDB(t, "")
	adminID := adminUser(t, db)
	pub := &mockPublisher{}
	lis, _ := startUserServer(t, db, pub)
	client := dialUserClient(t, lis)
	signer := auth.NewJWTSigner("test-secret", "", "")
	ctx := ctxBearer(t, signer, adminID, []string{model.RoleAdmin})

	created, err := client.CreateUser(ctx, &userv1.CreateUserRequest{
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

	got, err := client.GetUser(ctx, &userv1.GetUserRequest{Id: created.Id})
	if err != nil {
		t.Fatal(err)
	}
	if got.Email != "bob@example.com" {
		t.Fatalf("got %+v", got)
	}
}

func TestCreateUser_invalid(t *testing.T) {
	db := openTestDB(t, "")
	adminID := adminUser(t, db)
	lis, _ := startUserServer(t, db, nil)
	client := dialUserClient(t, lis)
	ctx := ctxBearer(t, auth.NewJWTSigner("test-secret", "", ""), adminID, []string{model.RoleAdmin})

	_, err := client.CreateUser(ctx, &userv1.CreateUserRequest{Username: "", Email: "x"})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("got %v", err)
	}
}

func TestGetUser_databaseError(t *testing.T) {
	db := openTestDB(t, "")
	if err := db.Migrator().DropTable(&model.User{}); err != nil {
		t.Fatal(err)
	}
	s := NewUserServer(db, nil)
	ctx := grpcauth.WithClaims(context.Background(), &grpcauth.Claims{UserID: "x", Roles: []string{model.RoleAdmin}})
	_, err := s.GetUser(ctx, &userv1.GetUserRequest{Id: "any-id"})
	if status.Code(err) != codes.Internal {
		t.Fatalf("expected Internal, got %v", err)
	}
}

func TestCreateUser_duplicate(t *testing.T) {
	db := openTestDB(t, "")
	s := NewUserServer(db, nil)
	ctx := grpcauth.WithClaims(context.Background(), &grpcauth.Claims{UserID: "a", Roles: []string{model.RoleAdmin}})
	_, err := s.CreateUser(ctx, &userv1.CreateUserRequest{Username: "dup", Email: "dup@x.com"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = s.CreateUser(ctx, &userv1.CreateUserRequest{Username: "dup", Email: "dup@x.com"})
	if status.Code(err) != codes.Internal {
		t.Fatalf("expected Internal, got %v", err)
	}
}

func TestCreateUser_kafkaNonStrict_ignoresPublishError(t *testing.T) {
	t.Setenv("KAFKA_STRICT", "")

	db := openTestDB(t, "")
	adminID := adminUser(t, db)
	pub := &mockPublisher{err: errors.New("kafka unavailable")}
	lis, _ := startUserServer(t, db, pub)
	client := dialUserClient(t, lis)
	ctx := ctxBearer(t, auth.NewJWTSigner("test-secret", "", ""), adminID, []string{model.RoleAdmin})

	created, err := client.CreateUser(ctx, &userv1.CreateUserRequest{
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

	db := openTestDB(t, "")
	adminID := adminUser(t, db)
	pub := &mockPublisher{err: errors.New("kafka down")}
	lis, _ := startUserServer(t, db, pub)
	client := dialUserClient(t, lis)
	ctx := ctxBearer(t, auth.NewJWTSigner("test-secret", "", ""), adminID, []string{model.RoleAdmin})

	_, err := client.CreateUser(ctx, &userv1.CreateUserRequest{
		Username: "k", Email: "k@k.com",
	})
	if err == nil {
		t.Fatal("expected error")
	}
	if status.Code(err) != codes.Internal {
		t.Fatalf("got %v", err)
	}
}
