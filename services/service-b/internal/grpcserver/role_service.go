package grpcserver

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"gorm.io/gorm"

	rolev1 "easy-devops-tutorial/service-b/internal/genpb/role/v1"
	"easy-devops-tutorial/service-b/internal/model"
)

// RoleServer implements role.v1.RoleService.
type RoleServer struct {
	rolev1.UnimplementedRoleServiceServer
	db *gorm.DB
}

// NewRoleServer constructs RoleServer.
func NewRoleServer(db *gorm.DB) *RoleServer {
	return &RoleServer{db: db}
}

func (s *RoleServer) admin(ctx context.Context) error {
	claims, err := requireClaims(ctx)
	if err != nil {
		return err
	}
	return requireAdmin(claims)
}

// CreateRole adds a role (admin).
func (s *RoleServer) CreateRole(ctx context.Context, req *rolev1.CreateRoleRequest) (*rolev1.Role, error) {
	if strings.TrimSpace(req.GetName()) == "" {
		return nil, status.Error(codes.InvalidArgument, "name is required")
	}
	if err := s.admin(ctx); err != nil {
		return nil, err
	}
	r := model.Role{ID: uuid.NewString(), Name: strings.TrimSpace(req.GetName())}
	if err := s.db.WithContext(ctx).Create(&r).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return nil, status.Error(codes.AlreadyExists, "role name exists")
		}
		return nil, status.Error(codes.Internal, "could not create role")
	}
	return roleToPB(&r), nil
}

// GetRole returns a role by id (admin).
func (s *RoleServer) GetRole(ctx context.Context, req *rolev1.GetRoleRequest) (*rolev1.Role, error) {
	if req.GetId() == "" {
		return nil, status.Error(codes.InvalidArgument, "id is required")
	}
	if err := s.admin(ctx); err != nil {
		return nil, err
	}
	var r model.Role
	if err := s.db.WithContext(ctx).Where("id = ?", req.GetId()).First(&r).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, status.Error(codes.NotFound, "role not found")
		}
		return nil, status.Error(codes.Internal, "database error")
	}
	return roleToPB(&r), nil
}

// UpdateRole renames a role (admin).
func (s *RoleServer) UpdateRole(ctx context.Context, req *rolev1.UpdateRoleRequest) (*rolev1.Role, error) {
	if req.GetId() == "" || strings.TrimSpace(req.GetName()) == "" {
		return nil, status.Error(codes.InvalidArgument, "id and name are required")
	}
	if err := s.admin(ctx); err != nil {
		return nil, err
	}
	var r model.Role
	if err := s.db.WithContext(ctx).Where("id = ?", req.GetId()).First(&r).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, status.Error(codes.NotFound, "role not found")
		}
		return nil, status.Error(codes.Internal, "database error")
	}
	r.Name = strings.TrimSpace(req.GetName())
	if err := s.db.WithContext(ctx).Save(&r).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return nil, status.Error(codes.AlreadyExists, "role name exists")
		}
		return nil, status.Error(codes.Internal, "could not update role")
	}
	return roleToPB(&r), nil
}

// DeleteRole removes a role (admin).
func (s *RoleServer) DeleteRole(ctx context.Context, req *rolev1.DeleteRoleRequest) (*rolev1.Role, error) {
	if req.GetId() == "" {
		return nil, status.Error(codes.InvalidArgument, "id is required")
	}
	if err := s.admin(ctx); err != nil {
		return nil, err
	}
	var r model.Role
	if err := s.db.WithContext(ctx).Where("id = ?", req.GetId()).First(&r).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, status.Error(codes.NotFound, "role not found")
		}
		return nil, status.Error(codes.Internal, "database error")
	}
	pb := roleToPB(&r)
	if err := s.db.WithContext(ctx).Delete(&model.Role{}, "id = ?", req.GetId()).Error; err != nil {
		return nil, status.Error(codes.Internal, "could not delete role")
	}
	return pb, nil
}

// ListRoles returns all roles (admin).
func (s *RoleServer) ListRoles(ctx context.Context, _ *rolev1.ListRolesRequest) (*rolev1.ListRolesResponse, error) {
	if err := s.admin(ctx); err != nil {
		return nil, err
	}
	var roles []model.Role
	if err := s.db.WithContext(ctx).Order("name").Find(&roles).Error; err != nil {
		return nil, status.Error(codes.Internal, "database error")
	}
	out := make([]*rolev1.Role, 0, len(roles))
	for i := range roles {
		out = append(out, roleToPB(&roles[i]))
	}
	return &rolev1.ListRolesResponse{Roles: out}, nil
}

// AssignUserRole attaches a role to a user (admin).
func (s *RoleServer) AssignUserRole(ctx context.Context, req *rolev1.AssignUserRoleRequest) (*rolev1.AssignUserRoleResponse, error) {
	if req.GetUserId() == "" || req.GetRoleId() == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id and role_id are required")
	}
	if err := s.admin(ctx); err != nil {
		return nil, err
	}
	var u model.User
	if err := s.db.WithContext(ctx).Where("id = ?", req.GetUserId()).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, status.Error(codes.NotFound, "user not found")
		}
		return nil, status.Error(codes.Internal, "database error")
	}
	var r model.Role
	if err := s.db.WithContext(ctx).Where("id = ?", req.GetRoleId()).First(&r).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, status.Error(codes.NotFound, "role not found")
		}
		return nil, status.Error(codes.Internal, "database error")
	}
	if err := s.db.WithContext(ctx).Model(&u).Association("Roles").Append(&r); err != nil {
		return nil, status.Error(codes.Internal, "could not assign role")
	}
	return &rolev1.AssignUserRoleResponse{}, nil
}

// RemoveUserRole removes a role from a user (admin).
func (s *RoleServer) RemoveUserRole(ctx context.Context, req *rolev1.RemoveUserRoleRequest) (*rolev1.RemoveUserRoleResponse, error) {
	if req.GetUserId() == "" || req.GetRoleId() == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id and role_id are required")
	}
	if err := s.admin(ctx); err != nil {
		return nil, err
	}
	var u model.User
	if err := s.db.WithContext(ctx).Preload("Roles").Where("id = ?", req.GetUserId()).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, status.Error(codes.NotFound, "user not found")
		}
		return nil, status.Error(codes.Internal, "database error")
	}
	var role model.Role
	if err := s.db.WithContext(ctx).Where("id = ?", req.GetRoleId()).First(&role).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, status.Error(codes.NotFound, "role not found")
		}
		return nil, status.Error(codes.Internal, "database error")
	}
	if err := s.db.WithContext(ctx).Model(&u).Association("Roles").Delete(&role); err != nil {
		return nil, status.Error(codes.Internal, "could not remove role")
	}
	return &rolev1.RemoveUserRoleResponse{}, nil
}
