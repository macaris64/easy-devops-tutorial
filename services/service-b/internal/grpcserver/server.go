package grpcserver

import (
	"context"
	"errors"
	"log"
	"os"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"gorm.io/gorm"

	"easy-devops-tutorial/service-b/internal/model"
	pb "easy-devops-tutorial/service-b/pb"
)

// UserEventPublisher publishes user lifecycle events (optional; may be nil).
type UserEventPublisher interface {
	PublishUserCreated(ctx context.Context, userID, username, email string) error
}

// UserServer implements the gRPC UserService.
type UserServer struct {
	pb.UnimplementedUserServiceServer
	db        *gorm.DB
	publisher UserEventPublisher
}

// NewUserServer wires the gRPC service.
func NewUserServer(db *gorm.DB, publisher UserEventPublisher) *UserServer {
	return &UserServer{db: db, publisher: publisher}
}

// GetUser returns a user by id.
func (s *UserServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
	if req.GetId() == "" {
		return nil, status.Error(codes.InvalidArgument, "id is required")
	}
	var u model.User
	if err := s.db.WithContext(ctx).Where("id = ?", req.Id).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, status.Error(codes.NotFound, "user not found")
		}
		log.Printf("GetUser database error: %v", err)
		return nil, status.Error(codes.Internal, "database error")
	}
	return &pb.User{Id: u.ID, Username: u.Username, Email: u.Email}, nil
}

// CreateUser persists a user and publishes user.created when a publisher is configured.
func (s *UserServer) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.User, error) {
	if req.GetUsername() == "" || req.GetEmail() == "" {
		return nil, status.Error(codes.InvalidArgument, "username and email are required")
	}
	u := model.User{
		ID:       uuid.NewString(),
		Username: req.Username,
		Email:    req.Email,
	}
	if err := s.db.WithContext(ctx).Create(&u).Error; err != nil {
		log.Printf("CreateUser database error: %v", err)
		return nil, status.Error(codes.Internal, "could not create user")
	}
	if s.publisher != nil {
		if err := s.publisher.PublishUserCreated(ctx, u.ID, u.Username, u.Email); err != nil {
			log.Printf("Kafka publish warning (user still created): %v", err)
			if os.Getenv("KAFKA_STRICT") == "1" {
				return nil, status.Error(codes.Internal, "failed to publish event")
			}
		}
	}
	return &pb.User{Id: u.ID, Username: u.Username, Email: u.Email}, nil
}
