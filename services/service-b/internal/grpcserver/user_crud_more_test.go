package grpcserver

import (
	"context"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	rolev1 "easy-devops-tutorial/service-b/internal/genpb/role/v1"
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

func TestUserServer_ListUsers_queryAndRoleFilter(t *testing.T) {
	db := openTestDB(t, "_listf")
	s := NewUserServer(db, nil)
	rs := NewRoleServer(db, nil)
	ctx := adminClaimsCtx(t, db)

	custom, err := rs.CreateRole(ctx, &rolev1.CreateRoleRequest{Name: "filtertest_role"})
	if err != nil {
		t.Fatal(err)
	}
	var ru model.Role
	if err := db.Where("name = ?", model.RoleUser).First(&ru).Error; err != nil {
		t.Fatal(err)
	}
	u1 := model.User{ID: "lf1", Username: "alpha_search", Email: "z@z.com", Roles: []model.Role{ru}}
	u2 := model.User{ID: "lf2", Username: "beta", Email: "findme@y.com", Roles: []model.Role{ru}}
	if err := db.Create(&u1).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&u2).Error; err != nil {
		t.Fatal(err)
	}
	if _, err := rs.AssignUserRole(ctx, &rolev1.AssignUserRoleRequest{UserId: u2.ID, RoleId: custom.Id}); err != nil {
		t.Fatal(err)
	}

	q := "findme"
	list, err := s.ListUsers(ctx, &userv1.ListUsersRequest{Query: &q})
	if err != nil || len(list.Users) != 1 || list.Users[0].Id != u2.ID {
		t.Fatalf("query: %v %+v", err, list)
	}

	roleName := "filtertest_role"
	list2, err := s.ListUsers(ctx, &userv1.ListUsersRequest{Role: &roleName})
	if err != nil || len(list2.Users) != 1 || list2.Users[0].Id != u2.ID {
		t.Fatalf("role: %v %+v", err, list2)
	}

	comboQ := "beta"
	list3, err := s.ListUsers(ctx, &userv1.ListUsersRequest{Query: &comboQ, Role: &roleName})
	if err != nil || len(list3.Users) != 1 {
		t.Fatalf("combo: %v %+v", err, list3)
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
