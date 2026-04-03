package grpcserver

import (
	"context"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	userv1 "easy-devops-tutorial/service-b/internal/genpb/user/v1"
	"easy-devops-tutorial/service-b/internal/grpcauth"
	"easy-devops-tutorial/service-b/internal/model"
)

func TestUserServer_ListUpdateDelete(t *testing.T) {
	db := openTestDB(t, "_auth")
	s := NewUserServer(db, nil)
	ctx := adminClaimsCtx(t, db)

	created, err := s.CreateUser(ctx, &userv1.CreateUserRequest{Username: "l1", Email: "l1@x.com"})
	if err != nil {
		t.Fatal(err)
	}
	list, err := s.ListUsers(ctx, &userv1.ListUsersRequest{})
	if err != nil || len(list.Users) < 2 {
		t.Fatalf("%v %d", err, len(list.Users))
	}
	up, err := s.UpdateUser(ctx, &userv1.UpdateUserRequest{Id: created.Id, Username: strPtr("l1b")})
	if err != nil || up.Username != "l1b" {
		t.Fatal(err)
	}
	del, err := s.DeleteUser(ctx, &userv1.DeleteUserRequest{Id: created.Id})
	if err != nil || del.Id != created.Id {
		t.Fatal(err)
	}
}

func TestUserServer_nonAdminDenied(t *testing.T) {
	db := openTestDB(t, "_auth")
	s := NewUserServer(db, nil)
	var ru model.Role
	if err := db.Where("name = ?", model.RoleUser).First(&ru).Error; err != nil {
		t.Fatal(err)
	}
	u := model.User{ID: "plain", Username: "p", Email: "p@p", Roles: []model.Role{ru}}
	if err := db.Create(&u).Error; err != nil {
		t.Fatal(err)
	}
	ctx := grpcauth.WithClaims(context.Background(), &grpcauth.Claims{UserID: u.ID, Roles: []string{model.RoleUser}})
	_, err := s.ListUsers(ctx, &userv1.ListUsersRequest{})
	if status.Code(err) != codes.PermissionDenied {
		t.Fatalf("%v", err)
	}
}

func TestUserServer_GetUser_self(t *testing.T) {
	db := openTestDB(t, "_auth")
	s := NewUserServer(db, nil)
	var ru model.Role
	_ = db.Where("name = ?", model.RoleUser).First(&ru).Error
	u := model.User{ID: "self1", Username: "s", Email: "s@s", Roles: []model.Role{ru}}
	_ = db.Create(&u).Error
	ctx := grpcauth.WithClaims(context.Background(), &grpcauth.Claims{UserID: u.ID, Roles: []string{model.RoleUser}})
	got, err := s.GetUser(ctx, &userv1.GetUserRequest{Id: u.ID})
	if err != nil || got.Id != u.ID {
		t.Fatal(err)
	}
}

func strPtr(s string) *string { return &s }
