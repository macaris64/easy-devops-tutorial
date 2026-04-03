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

	"easy-devops-tutorial/service-b/internal/auth"
	userv1 "easy-devops-tutorial/service-b/internal/genpb/user/v1"
	"easy-devops-tutorial/service-b/internal/model"
)

// UserEventPublisher publishes user lifecycle events (optional; may be nil).
type UserEventPublisher interface {
	PublishUserCreated(ctx context.Context, userID, username, email string) error
}

// UserServer implements user.v1.UserService.
type UserServer struct {
	userv1.UnimplementedUserServiceServer
	db        *gorm.DB
	publisher UserEventPublisher
}

// NewUserServer wires the gRPC user service.
func NewUserServer(db *gorm.DB, publisher UserEventPublisher) *UserServer {
	return &UserServer{db: db, publisher: publisher}
}

// GetUser returns a user by id (self or admin).
func (s *UserServer) GetUser(ctx context.Context, req *userv1.GetUserRequest) (*userv1.User, error) {
	if req.GetId() == "" {
		return nil, status.Error(codes.InvalidArgument, "id is required")
	}
	claims, err := requireClaims(ctx)
	if err != nil {
		return nil, err
	}
	if err := requireSelfOrAdmin(claims, req.GetId()); err != nil {
		return nil, err
	}
	var u model.User
	if err := s.db.WithContext(ctx).Preload("Roles").Where("id = ?", req.Id).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, status.Error(codes.NotFound, "user not found")
		}
		log.Printf("GetUser database error: %v", err)
		return nil, status.Error(codes.Internal, "database error")
	}
	return userToPB(&u), nil
}

// CreateUser persists a user (admin only). Optional password. Publishes user.created when configured.
func (s *UserServer) CreateUser(ctx context.Context, req *userv1.CreateUserRequest) (*userv1.User, error) {
	if req.GetUsername() == "" || req.GetEmail() == "" {
		return nil, status.Error(codes.InvalidArgument, "username and email are required")
	}
	claims, err := requireClaims(ctx)
	if err != nil {
		return nil, err
	}
	if err := requireAdmin(claims); err != nil {
		return nil, err
	}
	u := model.User{
		ID:       uuid.NewString(),
		Username: req.GetUsername(),
		Email:    req.GetEmail(),
	}
	if p := req.GetPassword(); p != "" {
		h, err := auth.HashPassword(p)
		if err != nil {
			return nil, status.Error(codes.Internal, "could not hash password")
		}
		u.PasswordHash = h
	}
	if err := s.db.WithContext(ctx).Create(&u).Error; err != nil {
		log.Printf("CreateUser database error: %v", err)
		return nil, status.Error(codes.Internal, "could not create user")
	}
	if err := s.db.WithContext(ctx).Preload("Roles").First(&u, "id = ?", u.ID).Error; err != nil {
		return nil, status.Error(codes.Internal, "could not load user")
	}
	if s.publisher != nil {
		if err := s.publisher.PublishUserCreated(ctx, u.ID, u.Username, u.Email); err != nil {
			log.Printf("Kafka publish warning (user still created): %v", err)
			if os.Getenv("KAFKA_STRICT") == "1" {
				return nil, status.Error(codes.Internal, "failed to publish event")
			}
		}
	}
	return userToPB(&u), nil
}

// ListUsers returns all users (admin only).
func (s *UserServer) ListUsers(ctx context.Context, _ *userv1.ListUsersRequest) (*userv1.ListUsersResponse, error) {
	claims, err := requireClaims(ctx)
	if err != nil {
		return nil, err
	}
	if err := requireAdmin(claims); err != nil {
		return nil, err
	}
	var users []model.User
	if err := s.db.WithContext(ctx).Preload("Roles").Order("created_at desc").Find(&users).Error; err != nil {
		return nil, status.Error(codes.Internal, "database error")
	}
	out := make([]*userv1.User, 0, len(users))
	for i := range users {
		out = append(out, userToPB(&users[i]))
	}
	return &userv1.ListUsersResponse{Users: out}, nil
}

// UpdateUser updates fields (admin only).
func (s *UserServer) UpdateUser(ctx context.Context, req *userv1.UpdateUserRequest) (*userv1.User, error) {
	if req.GetId() == "" {
		return nil, status.Error(codes.InvalidArgument, "id is required")
	}
	claims, err := requireClaims(ctx)
	if err != nil {
		return nil, err
	}
	if err := requireAdmin(claims); err != nil {
		return nil, err
	}
	var u model.User
	if err := s.db.WithContext(ctx).Preload("Roles").Where("id = ?", req.GetId()).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, status.Error(codes.NotFound, "user not found")
		}
		return nil, status.Error(codes.Internal, "database error")
	}
	if req.Username != nil && *req.Username != "" {
		u.Username = *req.Username
	}
	if req.Email != nil && *req.Email != "" {
		u.Email = *req.Email
	}
	if req.Password != nil && *req.Password != "" {
		h, err := auth.HashPassword(*req.Password)
		if err != nil {
			return nil, status.Error(codes.Internal, "could not hash password")
		}
		u.PasswordHash = h
	}
	if err := s.db.WithContext(ctx).Save(&u).Error; err != nil {
		return nil, status.Error(codes.Internal, "could not update user")
	}
	if err := s.db.WithContext(ctx).Preload("Roles").First(&u, "id = ?", u.ID).Error; err != nil {
		return nil, status.Error(codes.Internal, "could not load user")
	}
	return userToPB(&u), nil
}

// DeleteUser soft-deletes a user (admin only).
func (s *UserServer) DeleteUser(ctx context.Context, req *userv1.DeleteUserRequest) (*userv1.User, error) {
	if req.GetId() == "" {
		return nil, status.Error(codes.InvalidArgument, "id is required")
	}
	claims, err := requireClaims(ctx)
	if err != nil {
		return nil, err
	}
	if err := requireAdmin(claims); err != nil {
		return nil, err
	}
	var u model.User
	if err := s.db.WithContext(ctx).Preload("Roles").Where("id = ?", req.GetId()).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, status.Error(codes.NotFound, "user not found")
		}
		return nil, status.Error(codes.Internal, "database error")
	}
	pb := userToPB(&u)
	if err := s.db.WithContext(ctx).Delete(&model.User{}, "id = ?", req.GetId()).Error; err != nil {
		return nil, status.Error(codes.Internal, "could not delete user")
	}
	return pb, nil
}
