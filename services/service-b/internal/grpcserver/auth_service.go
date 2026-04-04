package grpcserver

import (
	"context"
	"errors"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"gorm.io/gorm"

	"easy-devops-tutorial/service-b/internal/auth"
	authv1 "easy-devops-tutorial/service-b/internal/genpb/auth/v1"
	"easy-devops-tutorial/service-b/internal/model"
)

// AuthServer implements auth.v1.AuthService.
type AuthServer struct {
	authv1.UnimplementedAuthServiceServer
	db         *gorm.DB
	signer     *auth.JWTSigner
	accessTTL  time.Duration
	refreshTTL time.Duration
	publisher  DomainEventPublisher
}

// NewAuthServer constructs AuthServer.
func NewAuthServer(db *gorm.DB, signer *auth.JWTSigner, accessTTL, refreshTTL time.Duration, pub DomainEventPublisher) *AuthServer {
	return &AuthServer{
		db: db, signer: signer,
		accessTTL: accessTTL, refreshTTL: refreshTTL, publisher: pub,
	}
}

// Register creates a user with password and default user role.
func (s *AuthServer) Register(ctx context.Context, req *authv1.RegisterRequest) (*authv1.RegisterResponse, error) {
	if req.GetUsername() == "" || req.GetEmail() == "" || len(req.GetPassword()) < 8 {
		return nil, status.Error(codes.InvalidArgument, "username, email, and password (min 8) are required")
	}
	hash, err := auth.HashPassword(req.GetPassword())
	if err != nil {
		return nil, status.Error(codes.Internal, "could not hash password")
	}
	u := model.User{
		ID:           uuid.NewString(),
		Username:     req.GetUsername(),
		Email:        req.GetEmail(),
		PasswordHash: hash,
	}
	var userRole model.Role
	if err := s.db.WithContext(ctx).Where("name = ?", model.RoleUser).First(&userRole).Error; err != nil {
		return nil, status.Error(codes.Internal, "default role missing")
	}
	u.Roles = []model.Role{userRole}
	if err := s.db.WithContext(ctx).Create(&u).Error; err != nil {
		log.Printf("Register database error: %v", err)
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return nil, status.Error(codes.AlreadyExists, "username or email taken")
		}
		return nil, status.Error(codes.Internal, "could not create user")
	}
	if err := s.db.WithContext(ctx).Preload("Roles").First(&u, "id = ?", u.ID).Error; err != nil {
		return nil, status.Error(codes.Internal, "could not load user")
	}
	if s.publisher != nil {
		if err := s.publisher.PublishUserCreated(ctx, u.ID, u.Username, u.Email, "registration"); err != nil {
			if e := kafkaPublishError("Register", err); e != nil {
				return nil, e
			}
		}
	}
	return &authv1.RegisterResponse{User: userToPB(&u)}, nil
}

// Login returns JWT access token and refresh token.
func (s *AuthServer) Login(ctx context.Context, req *authv1.LoginRequest) (*authv1.LoginResponse, error) {
	if req.GetUsername() == "" || req.GetPassword() == "" {
		return nil, status.Error(codes.InvalidArgument, "username and password are required")
	}
	var u model.User
	if err := s.db.WithContext(ctx).Preload("Roles").Where("username = ?", req.GetUsername()).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, status.Error(codes.Unauthenticated, "invalid credentials")
		}
		return nil, status.Error(codes.Internal, "database error")
	}
	if u.PasswordHash == "" || !auth.CheckPassword(u.PasswordHash, req.GetPassword()) {
		return nil, status.Error(codes.Unauthenticated, "invalid credentials")
	}
	names := roleNames(&u)
	access, expSecs, err := s.signer.IssueAccessToken(u.ID, names, s.accessTTL)
	if err != nil {
		return nil, status.Error(codes.Internal, "could not issue token")
	}
	plain, hash, err := auth.RandomToken()
	if err != nil {
		return nil, status.Error(codes.Internal, "could not issue refresh")
	}
	rt := model.RefreshToken{
		ID:        uuid.NewString(),
		UserID:    u.ID,
		TokenHash: hash,
		ExpiresAt: time.Now().UTC().Add(s.refreshTTL),
	}
	if err := s.db.WithContext(ctx).Create(&rt).Error; err != nil {
		return nil, status.Error(codes.Internal, "could not store refresh token")
	}
	if s.publisher != nil {
		if err := s.publisher.PublishAuthLogin(ctx, u.ID, u.Username); err != nil {
			if e := kafkaPublishError("Login", err); e != nil {
				return nil, e
			}
		}
	}
	return &authv1.LoginResponse{
		AccessToken:      access,
		RefreshToken:     plain,
		ExpiresInSeconds: expSecs,
		User:             userToPB(&u),
	}, nil
}

// Logout revokes a refresh token (requires JWT).
func (s *AuthServer) Logout(ctx context.Context, req *authv1.LogoutRequest) (*authv1.LogoutResponse, error) {
	if req.GetRefreshToken() == "" {
		return nil, status.Error(codes.InvalidArgument, "refresh_token is required")
	}
	claims, err := requireClaims(ctx)
	if err != nil {
		return nil, err
	}
	h := auth.HashToken(req.GetRefreshToken())
	if err := s.db.WithContext(ctx).Where("token_hash = ?", h).Delete(&model.RefreshToken{}).Error; err != nil {
		return nil, status.Error(codes.Internal, "logout failed")
	}
	if s.publisher != nil {
		if err := s.publisher.PublishAuthLogout(ctx, claims.UserID); err != nil {
			if e := kafkaPublishError("Logout", err); e != nil {
				return nil, e
			}
		}
	}
	return &authv1.LogoutResponse{}, nil
}

// Me returns the current user from JWT.
func (s *AuthServer) Me(ctx context.Context, _ *authv1.MeRequest) (*authv1.MeResponse, error) {
	claims, err := requireClaims(ctx)
	if err != nil {
		return nil, err
	}
	var u model.User
	if err := s.db.WithContext(ctx).Preload("Roles").Where("id = ?", claims.UserID).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, status.Error(codes.NotFound, "user not found")
		}
		return nil, status.Error(codes.Internal, "database error")
	}
	return &authv1.MeResponse{User: userToPB(&u)}, nil
}

// ForgotPassword creates a reset token (response is generic; optional dev token).
func (s *AuthServer) ForgotPassword(ctx context.Context, req *authv1.ForgotPasswordRequest) (*authv1.ForgotPasswordResponse, error) {
	if req.GetEmail() == "" {
		return nil, status.Error(codes.InvalidArgument, "email is required")
	}
	msg := "If an account exists for this email, reset instructions have been recorded."
	var u model.User
	err := s.db.WithContext(ctx).Where("email = ?", req.GetEmail()).First(&u).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &authv1.ForgotPasswordResponse{Message: msg}, nil
		}
		return nil, status.Error(codes.Internal, "database error")
	}
	plain, hash, err := auth.RandomToken()
	if err != nil {
		return nil, status.Error(codes.Internal, "could not create token")
	}
	pr := model.PasswordResetToken{
		ID:        uuid.NewString(),
		UserID:    u.ID,
		TokenHash: hash,
		ExpiresAt: time.Now().UTC().Add(1 * time.Hour),
	}
	if err := s.db.WithContext(ctx).Create(&pr).Error; err != nil {
		return nil, status.Error(codes.Internal, "could not store reset token")
	}
	if s.publisher != nil {
		if err := s.publisher.PublishAuthPasswordResetRequested(ctx, u.ID); err != nil {
			if e := kafkaPublishError("ForgotPassword", err); e != nil {
				return nil, e
			}
		}
	}
	resp := &authv1.ForgotPasswordResponse{Message: msg}
	if os.Getenv("PASSWORD_RESET_DEV_RETURN_TOKEN") == "1" {
		t := plain
		resp.ResetToken = &t
	}
	return resp, nil
}

// ResetPassword sets a new password using a reset token.
func (s *AuthServer) ResetPassword(ctx context.Context, req *authv1.ResetPasswordRequest) (*authv1.ResetPasswordResponse, error) {
	if req.GetToken() == "" || len(req.GetNewPassword()) < 8 {
		return nil, status.Error(codes.InvalidArgument, "token and new_password (min 8) are required")
	}
	h := auth.HashToken(req.GetToken())
	var pr model.PasswordResetToken
	if err := s.db.WithContext(ctx).Where("token_hash = ? AND expires_at > ?", h, time.Now().UTC()).First(&pr).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, status.Error(codes.InvalidArgument, "invalid or expired token")
		}
		return nil, status.Error(codes.Internal, "database error")
	}
	hash, err := auth.HashPassword(req.GetNewPassword())
	if err != nil {
		return nil, status.Error(codes.Internal, "could not hash password")
	}
	if err := s.db.WithContext(ctx).Model(&model.User{}).Where("id = ?", pr.UserID).Update("password_hash", hash).Error; err != nil {
		return nil, status.Error(codes.Internal, "could not update password")
	}
	_ = s.db.WithContext(ctx).Where("user_id = ?", pr.UserID).Delete(&model.PasswordResetToken{})
	if s.publisher != nil {
		if err := s.publisher.PublishAuthPasswordResetCompleted(ctx, pr.UserID); err != nil {
			if e := kafkaPublishError("ResetPassword", err); e != nil {
				return nil, e
			}
		}
	}
	return &authv1.ResetPasswordResponse{}, nil
}
