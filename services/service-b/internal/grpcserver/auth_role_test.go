package grpcserver

import (
	"context"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"gorm.io/gorm"

	"easy-devops-tutorial/service-b/internal/auth"
	authv1 "easy-devops-tutorial/service-b/internal/genpb/auth/v1"
	rolev1 "easy-devops-tutorial/service-b/internal/genpb/role/v1"
	"easy-devops-tutorial/service-b/internal/grpcauth"
	"easy-devops-tutorial/service-b/internal/model"
)

func adminClaimsCtx(t *testing.T, db *gorm.DB) context.Context {
	t.Helper()
	h, err := auth.HashPassword("p")
	if err != nil {
		t.Fatal(err)
	}
	var ra, ru model.Role
	if err := db.Where("name = ?", model.RoleAdmin).First(&ra).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Where("name = ?", model.RoleUser).First(&ru).Error; err != nil {
		t.Fatal(err)
	}
	u := model.User{ID: "adm1", Username: "adm", Email: "a@a", PasswordHash: h, Roles: []model.Role{ru, ra}}
	if err := db.Create(&u).Error; err != nil {
		t.Fatal(err)
	}
	return grpcauth.WithClaims(context.Background(), &grpcauth.Claims{
		UserID: u.ID,
		Roles:  []string{model.RoleUser, model.RoleAdmin},
	})
}

func TestAuthServer_RegisterLoginLogoutMe(t *testing.T) {
	db := openTestDB(t, "_auth")
	signer := auth.NewJWTSigner("t", "", "")
	as := NewAuthServer(db, signer, time.Minute, time.Hour, nil)

	_, err := as.Register(context.Background(), &authv1.RegisterRequest{
		Username: "reg", Email: "reg@e.com", Password: "password12",
	})
	if err != nil {
		t.Fatal(err)
	}

	login, err := as.Login(context.Background(), &authv1.LoginRequest{Username: "reg", Password: "password12"})
	if err != nil || login.AccessToken == "" || login.RefreshToken == "" {
		t.Fatalf("%v %+v", err, login)
	}

	ctxUser := grpcauth.WithClaims(context.Background(), &grpcauth.Claims{
		UserID: login.User.Id,
		Roles:  login.User.Roles,
	})

	me, err := as.Me(ctxUser, &authv1.MeRequest{})
	if err != nil || me.User.GetUsername() != "reg" {
		t.Fatal(err)
	}

	if _, err := as.Logout(ctxUser, &authv1.LogoutRequest{RefreshToken: login.RefreshToken}); err != nil {
		t.Fatal(err)
	}
}

func TestAuthServer_Register_validation(t *testing.T) {
	db := openTestDB(t, "_auth")
	as := NewAuthServer(db, auth.NewJWTSigner("t", "", ""), time.Minute, time.Hour, nil)
	_, err := as.Register(context.Background(), &authv1.RegisterRequest{Username: "", Email: "a@a", Password: "password12"})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatal(err)
	}
}

func TestAuthServer_ForgotResetPassword(t *testing.T) {
	t.Setenv("PASSWORD_RESET_DEV_RETURN_TOKEN", "1")
	db := openTestDB(t, "_auth")
	signer := auth.NewJWTSigner("t", "", "")

	as := NewAuthServer(db, signer, time.Minute, time.Hour, nil)
	_, _ = as.Register(context.Background(), &authv1.RegisterRequest{Username: "u", Email: "e@e.com", Password: "password12"})

	fp, err := as.ForgotPassword(context.Background(), &authv1.ForgotPasswordRequest{Email: "e@e.com"})
	if err != nil || fp.GetResetToken() == "" {
		t.Fatalf("%v %+v", err, fp)
	}

	if _, err := as.ResetPassword(context.Background(), &authv1.ResetPasswordRequest{
		Token: fp.GetResetToken(), NewPassword: "newpass123",
	}); err != nil {
		t.Fatal(err)
	}
}

func TestRoleServer_CRUD(t *testing.T) {
	db := openTestDB(t, "_auth")
	rs := NewRoleServer(db, nil)
	ctx := adminClaimsCtx(t, db)

	r, err := rs.CreateRole(ctx, &rolev1.CreateRoleRequest{Name: "editor"})
	if err != nil || r.Name != "editor" {
		t.Fatal(err)
	}
	got, err := rs.GetRole(ctx, &rolev1.GetRoleRequest{Id: r.Id})
	if err != nil || got.Name != "editor" {
		t.Fatal(err)
	}
	list, err := rs.ListRoles(ctx, &rolev1.ListRolesRequest{})
	if err != nil || len(list.Roles) < 3 {
		t.Fatalf("%v", list)
	}
	q := "edit"
	listQ, err := rs.ListRoles(ctx, &rolev1.ListRolesRequest{Query: &q})
	if err != nil || len(listQ.Roles) != 1 || listQ.Roles[0].Name != "editor" {
		t.Fatalf("ListRoles query: %v %+v", err, listQ)
	}
	up, err := rs.UpdateRole(ctx, &rolev1.UpdateRoleRequest{Id: r.Id, Name: "editor2"})
	if err != nil || up.Name != "editor2" {
		t.Fatal(err)
	}
	del, err := rs.DeleteRole(ctx, &rolev1.DeleteRoleRequest{Id: r.Id})
	if err != nil || del.Name != "editor2" {
		t.Fatal(err)
	}
}

func TestRoleServer_AssignRemoveUserRole(t *testing.T) {
	db := openTestDB(t, "_auth")
	rs := NewRoleServer(db, nil)
	ctx := adminClaimsCtx(t, db)

	role, err := rs.CreateRole(ctx, &rolev1.CreateRoleRequest{Name: "r1"})
	if err != nil {
		t.Fatal(err)
	}
	var ru model.Role
	if err := db.Where("name = ?", model.RoleUser).First(&ru).Error; err != nil {
		t.Fatal(err)
	}
	u := model.User{ID: "u2", Username: "uu", Email: "uu@u", Roles: []model.Role{ru}}
	if err := db.Create(&u).Error; err != nil {
		t.Fatal(err)
	}
	if _, err := rs.AssignUserRole(ctx, &rolev1.AssignUserRoleRequest{UserId: u.ID, RoleId: role.Id}); err != nil {
		t.Fatal(err)
	}
	if _, err := rs.RemoveUserRole(ctx, &rolev1.RemoveUserRoleRequest{UserId: u.ID, RoleId: role.Id}); err != nil {
		t.Fatal(err)
	}
}

func TestInterceptor_publicAndProtected(t *testing.T) {
	signer := auth.NewJWTSigner("sec", "", "")
	iv := AuthUnaryInterceptor(signer, PublicGRPCMethods())

	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return "ok", nil
	}
	_, err := iv(context.Background(), nil, &grpc.UnaryServerInfo{FullMethod: authv1.AuthService_Login_FullMethodName}, handler)
	if err != nil {
		t.Fatal(err)
	}

	_, err = iv(context.Background(), nil, &grpc.UnaryServerInfo{FullMethod: authv1.AuthService_Me_FullMethodName}, handler)
	if err == nil || status.Code(err) != codes.Unauthenticated {
		t.Fatalf("%v", err)
	}
}

func TestRequireSelfOrAdmin(t *testing.T) {
	c := &grpcauth.Claims{UserID: "a", Roles: []string{model.RoleUser}}
	if requireSelfOrAdmin(c, "a") != nil {
		t.Fatal()
	}
	if requireSelfOrAdmin(c, "b") == nil {
		t.Fatal()
	}
	c2 := &grpcauth.Claims{UserID: "a", Roles: []string{model.RoleAdmin}}
	if requireSelfOrAdmin(c2, "b") != nil {
		t.Fatal()
	}
}
