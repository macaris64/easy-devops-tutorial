package grpcserver

import (
	"context"
	"errors"
	"log"
	"strings"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"gorm.io/gorm"

	"easy-devops-tutorial/service-b/internal/auth"
	userv1 "easy-devops-tutorial/service-b/internal/genpb/user/v1"
	"easy-devops-tutorial/service-b/internal/model"
)

// UserServer implements user.v1.UserService.
type UserServer struct {
	userv1.UnimplementedUserServiceServer
	db        *gorm.DB
	publisher DomainEventPublisher
}

// NewUserServer wires the gRPC user service.
func NewUserServer(db *gorm.DB, publisher DomainEventPublisher) *UserServer {
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

// CreateUser persists a user (admin only). Optional password. Publishes Kafka user+user.created when configured.
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
		if err := s.publisher.PublishUserCreated(ctx, u.ID, u.Username, u.Email, "admin"); err != nil {
			if e := kafkaPublishError("CreateUser", err); e != nil {
				return nil, e
			}
		}
	}
	return userToPB(&u), nil
}

// ListUsers returns all users (admin only), optionally filtered by text query and role name.
func (s *UserServer) ListUsers(ctx context.Context, req *userv1.ListUsersRequest) (*userv1.ListUsersResponse, error) {
	claims, err := requireClaims(ctx)
	if err != nil {
		return nil, err
	}
	if err := requireAdmin(claims); err != nil {
		return nil, err
	}
	tx := s.db.WithContext(ctx).Model(&model.User{})
	if roleName := strings.TrimSpace(req.GetRole()); roleName != "" {
		tx = tx.Joins("INNER JOIN user_roles ON user_roles.user_id = users.id").
			Joins("INNER JOIN roles role_filter ON role_filter.id = user_roles.role_id AND LOWER(role_filter.name) = LOWER(?)", roleName)
	}
	if pat, ok := likeSubstringPattern(req.GetQuery()); ok {
		tx = tx.Where("(LOWER(users.username) LIKE ? OR LOWER(users.email) LIKE ?)", pat, pat)
	}
	var users []model.User
	if err := tx.Preload("Roles").Order("users.created_at desc").Distinct().Find(&users).Error; err != nil {
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
	if s.publisher != nil {
		if err := s.publisher.PublishUserUpdated(ctx, u.ID, u.Username, u.Email); err != nil {
			if e := kafkaPublishError("UpdateUser", err); e != nil {
				return nil, e
			}
		}
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
	if s.publisher != nil {
		if err := s.publisher.PublishUserDeleted(ctx, u.ID, u.Username, u.Email); err != nil {
			if e := kafkaPublishError("DeleteUser", err); e != nil {
				return nil, e
			}
		}
	}
	return pb, nil
}
