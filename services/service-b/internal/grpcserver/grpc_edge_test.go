package grpcserver

import (
	"context"
	"errors"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"easy-devops-tutorial/service-b/internal/auth"
	authv1 "easy-devops-tutorial/service-b/internal/genpb/auth/v1"
	rolev1 "easy-devops-tutorial/service-b/internal/genpb/role/v1"
	userv1 "easy-devops-tutorial/service-b/internal/genpb/user/v1"
	"easy-devops-tutorial/service-b/internal/grpcauth"
	"easy-devops-tutorial/service-b/internal/model"
)

type errPublisher struct{}

func (errPublisher) PublishUserCreated(context.Context, string, string, string, string) error {
	return errors.New("kafka down")
}
func (errPublisher) PublishUserUpdated(context.Context, string, string, string) error {
	return errors.New("kafka down")
}
func (errPublisher) PublishUserDeleted(context.Context, string, string, string) error {
	return errors.New("kafka down")
}
func (errPublisher) PublishAuthLogin(context.Context, string, string) error {
	return errors.New("kafka down")
}
func (errPublisher) PublishAuthLogout(context.Context, string) error { return errors.New("kafka down") }
func (errPublisher) PublishAuthPasswordResetRequested(context.Context, string) error {
	return errors.New("kafka down")
}
func (errPublisher) PublishAuthPasswordResetCompleted(context.Context, string) error {
	return errors.New("kafka down")
}
func (errPublisher) PublishRoleCreated(context.Context, string, string) error {
	return errors.New("kafka down")
}
func (errPublisher) PublishRoleUpdated(context.Context, string, string) error {
	return errors.New("kafka down")
}
func (errPublisher) PublishRoleDeleted(context.Context, string, string) error {
	return errors.New("kafka down")
}
func (errPublisher) PublishUserRoleAssigned(context.Context, string, string) error {
	return errors.New("kafka down")
}
func (errPublisher) PublishUserRoleRemoved(context.Context, string, string) error {
	return errors.New("kafka down")
}

func TestAuthServer_Register_duplicate(t *testing.T) {
	db := openTestDB(t, "_edge")
	as := NewAuthServer(db, auth.NewJWTSigner("t", "", ""), time.Minute, time.Hour, nil)
	_, err := as.Register(context.Background(), &authv1.RegisterRequest{
		Username: "d1", Email: "d1@e.com", Password: "password12",
	})
	if err != nil {
		t.Fatal(err)
	}
	_, err = as.Register(context.Background(), &authv1.RegisterRequest{
		Username: "d1", Email: "d2@e.com", Password: "password12",
	})
	if status.Code(err) != codes.AlreadyExists {
		t.Fatalf("got %v", err)
	}
}

func TestAuthServer_Register_defaultRoleMissing(t *testing.T) {
	db := openTestDB(t, "_edge2")
	if err := db.Where("name = ?", model.RoleUser).Delete(&model.Role{}).Error; err != nil {
		t.Fatal(err)
	}
	as := NewAuthServer(db, auth.NewJWTSigner("t", "", ""), time.Minute, time.Hour, nil)
	_, err := as.Register(context.Background(), &authv1.RegisterRequest{
		Username: "x", Email: "x@x.com", Password: "password12",
	})
	if status.Code(err) != codes.Internal {
		t.Fatalf("got %v", err)
	}
}

func TestAuthServer_Register_kafkaStrict(t *testing.T) {
	t.Setenv("KAFKA_STRICT", "1")
	t.Cleanup(func() { t.Setenv("KAFKA_STRICT", "") })
	db := openTestDB(t, "_edgek")
	as := NewAuthServer(db, auth.NewJWTSigner("t", "", ""), time.Minute, time.Hour, errPublisher{})
	_, err := as.Register(context.Background(), &authv1.RegisterRequest{
		Username: "k", Email: "k@k.com", Password: "password12",
	})
	if status.Code(err) != codes.Internal {
		t.Fatalf("got %v", err)
	}
}

func TestAuthServer_Login_validationAndAuth(t *testing.T) {
	db := openTestDB(t, "_edgel")
	as := NewAuthServer(db, auth.NewJWTSigner("t", "", ""), time.Minute, time.Hour, nil)
	_, err := as.Login(context.Background(), &authv1.LoginRequest{})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("got %v", err)
	}
	_, err = as.Login(context.Background(), &authv1.LoginRequest{Username: "nope", Password: "password12"})
	if status.Code(err) != codes.Unauthenticated {
		t.Fatalf("got %v", err)
	}
	_, _ = as.Register(context.Background(), &authv1.RegisterRequest{
		Username: "logu", Email: "logu@e.com", Password: "password12",
	})
	_, err = as.Login(context.Background(), &authv1.LoginRequest{Username: "logu", Password: "wrongpass1"})
	if status.Code(err) != codes.Unauthenticated {
		t.Fatalf("got %v", err)
	}
}

func TestAuthServer_Logout_and_Me_errors(t *testing.T) {
	db := openTestDB(t, "_edgem")
	as := NewAuthServer(db, auth.NewJWTSigner("t", "", ""), time.Minute, time.Hour, nil)
	_, err := as.Logout(context.Background(), &authv1.LogoutRequest{})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("got %v", err)
	}
	ctx := grpcauth.WithClaims(context.Background(), &grpcauth.Claims{UserID: "u", Roles: []string{model.RoleUser}})
	_, err = as.Logout(ctx, &authv1.LogoutRequest{RefreshToken: "not-stored"})
	if err != nil {
		t.Fatal(err)
	}

	_, err = as.Me(context.Background(), &authv1.MeRequest{})
	if status.Code(err) != codes.Unauthenticated {
		t.Fatalf("got %v", err)
	}
	_, err = as.Me(ctx, &authv1.MeRequest{})
	if status.Code(err) != codes.NotFound {
		t.Fatalf("got %v", err)
	}
}

func TestAuthServer_ForgotPassword_validation(t *testing.T) {
	db := openTestDB(t, "_edgef")
	as := NewAuthServer(db, auth.NewJWTSigner("t", "", ""), time.Minute, time.Hour, nil)
	_, err := as.ForgotPassword(context.Background(), &authv1.ForgotPasswordRequest{})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("got %v", err)
	}
	fp, err := as.ForgotPassword(context.Background(), &authv1.ForgotPasswordRequest{Email: "missing@e.com"})
	if err != nil || fp.GetMessage() == "" {
		t.Fatalf("%v %+v", err, fp)
	}
}

func TestAuthServer_ResetPassword_validation(t *testing.T) {
	db := openTestDB(t, "_edger")
	as := NewAuthServer(db, auth.NewJWTSigner("t", "", ""), time.Minute, time.Hour, nil)
	_, err := as.ResetPassword(context.Background(), &authv1.ResetPasswordRequest{})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("got %v", err)
	}
	_, err = as.ResetPassword(context.Background(), &authv1.ResetPasswordRequest{
		Token: "bad", NewPassword: "short",
	})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("got %v", err)
	}
	_, err = as.ResetPassword(context.Background(), &authv1.ResetPasswordRequest{
		Token: "nope", NewPassword: "longenough1",
	})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("got %v", err)
	}
}

func TestUserServer_GetUser_validationAndNotFound(t *testing.T) {
	db := openTestDB(t, "_edgeu")
	s := NewUserServer(db, nil)
	ctx := adminClaimsCtx(t, db)
	_, err := s.GetUser(ctx, &userv1.GetUserRequest{})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("got %v", err)
	}
	_, err = s.GetUser(ctx, &userv1.GetUserRequest{Id: "missing-id"})
	if status.Code(err) != codes.NotFound {
		t.Fatalf("got %v", err)
	}
}

func TestUserServer_CreateUser_validationAndKafka(t *testing.T) {
	db := openTestDB(t, "_edgeuc")
	ctx := adminClaimsCtx(t, db)
	s := NewUserServer(db, errPublisher{})
	_, err := s.CreateUser(ctx, &userv1.CreateUserRequest{})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("got %v", err)
	}
	pw := "password99"
	u, err := s.CreateUser(ctx, &userv1.CreateUserRequest{
		Username: "pwu", Email: "pwu@e.com", Password: &pw,
	})
	if err != nil || u.Id == "" {
		t.Fatalf("%v %+v", err, u)
	}

	t.Setenv("KAFKA_STRICT", "1")
	t.Cleanup(func() { t.Setenv("KAFKA_STRICT", "") })
	s2 := NewUserServer(db, errPublisher{})
	_, err = s2.CreateUser(ctx, &userv1.CreateUserRequest{Username: "kz", Email: "kz@e.com"})
	if status.Code(err) != codes.Internal {
		t.Fatalf("got %v", err)
	}
}

func TestUserServer_UpdateDelete_notFound(t *testing.T) {
	db := openTestDB(t, "_edgeud")
	s := NewUserServer(db, nil)
	ctx := adminClaimsCtx(t, db)
	_, err := s.UpdateUser(ctx, &userv1.UpdateUserRequest{Id: "missing"})
	if status.Code(err) != codes.NotFound {
		t.Fatalf("got %v", err)
	}
	_, err = s.DeleteUser(ctx, &userv1.DeleteUserRequest{Id: "missing"})
	if status.Code(err) != codes.NotFound {
		t.Fatalf("got %v", err)
	}
}

func TestUserServer_UpdateUser_emailPassword(t *testing.T) {
	db := openTestDB(t, "_edgeue")
	s := NewUserServer(db, nil)
	ctx := adminClaimsCtx(t, db)
	c, err := s.CreateUser(ctx, &userv1.CreateUserRequest{Username: "ue", Email: "ue@e.com"})
	if err != nil {
		t.Fatal(err)
	}
	up, err := s.UpdateUser(ctx, &userv1.UpdateUserRequest{
		Id: c.Id, Email: strPtr("ue2@e.com"), Password: strPtr("newpass123"),
	})
	if err != nil || up.Email != "ue2@e.com" {
		t.Fatalf("%v %+v", err, up)
	}
}

func TestRoleServer_CreateGet_validation(t *testing.T) {
	db := openTestDB(t, "_edgerl")
	rs := NewRoleServer(db, nil)
	ctx := adminClaimsCtx(t, db)
	_, err := rs.CreateRole(ctx, &rolev1.CreateRoleRequest{Name: "  "})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("got %v", err)
	}
	r, err := rs.CreateRole(ctx, &rolev1.CreateRoleRequest{Name: "uniqrole"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = rs.CreateRole(ctx, &rolev1.CreateRoleRequest{Name: "uniqrole"})
	if status.Code(err) != codes.AlreadyExists {
		t.Fatalf("got %v", err)
	}
	_, err = rs.GetRole(ctx, &rolev1.GetRoleRequest{})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("got %v", err)
	}
	_, err = rs.GetRole(ctx, &rolev1.GetRoleRequest{Id: "nope"})
	if status.Code(err) != codes.NotFound {
		t.Fatalf("got %v", err)
	}
	_, err = rs.GetRole(ctx, &rolev1.GetRoleRequest{Id: r.Id})
	if err != nil {
		t.Fatal(err)
	}
}

func TestRoleServer_UpdateDelete_notFoundAndDup(t *testing.T) {
	db := openTestDB(t, "_edger2")
	rs := NewRoleServer(db, nil)
	ctx := adminClaimsCtx(t, db)
	a, err := rs.CreateRole(ctx, &rolev1.CreateRoleRequest{Name: "ra"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = rs.CreateRole(ctx, &rolev1.CreateRoleRequest{Name: "rb"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = rs.UpdateRole(ctx, &rolev1.UpdateRoleRequest{Id: "x", Name: "y"})
	if status.Code(err) != codes.NotFound {
		t.Fatalf("got %v", err)
	}
	_, err = rs.UpdateRole(ctx, &rolev1.UpdateRoleRequest{Id: a.Id, Name: "rb"})
	if status.Code(err) != codes.AlreadyExists {
		t.Fatalf("got %v", err)
	}
	_, err = rs.DeleteRole(ctx, &rolev1.DeleteRoleRequest{Id: "missing-role"})
	if status.Code(err) != codes.NotFound {
		t.Fatalf("got %v", err)
	}
}

func TestRoleServer_AssignRemove_notFound(t *testing.T) {
	db := openTestDB(t, "_edger3")
	rs := NewRoleServer(db, nil)
	ctx := adminClaimsCtx(t, db)
	r, err := rs.CreateRole(ctx, &rolev1.CreateRoleRequest{Name: "rassign"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = rs.AssignUserRole(ctx, &rolev1.AssignUserRoleRequest{UserId: "nope", RoleId: r.Id})
	if status.Code(err) != codes.NotFound {
		t.Fatalf("got %v", err)
	}
	var ru model.Role
	_ = db.Where("name = ?", model.RoleUser).First(&ru).Error
	u := model.User{ID: "uas", Username: "uas", Email: "uas@u", Roles: []model.Role{ru}}
	_ = db.Create(&u).Error
	_, err = rs.AssignUserRole(ctx, &rolev1.AssignUserRoleRequest{UserId: u.ID, RoleId: "nope"})
	if status.Code(err) != codes.NotFound {
		t.Fatalf("got %v", err)
	}
	_, err = rs.RemoveUserRole(ctx, &rolev1.RemoveUserRoleRequest{UserId: "nope", RoleId: r.Id})
	if status.Code(err) != codes.NotFound {
		t.Fatalf("got %v", err)
	}
}

func TestRoleServer_ListRoles_nonAdmin(t *testing.T) {
	db := openTestDB(t, "_edger4")
	rs := NewRoleServer(db, nil)
	var ru model.Role
	_ = db.Where("name = ?", model.RoleUser).First(&ru).Error
	u := model.User{ID: "plain2", Username: "p2", Email: "p2@p", Roles: []model.Role{ru}}
	_ = db.Create(&u).Error
	ctx := grpcauth.WithClaims(context.Background(), &grpcauth.Claims{UserID: u.ID, Roles: []string{model.RoleUser}})
	_, err := rs.ListRoles(ctx, &rolev1.ListRolesRequest{})
	if status.Code(err) != codes.PermissionDenied {
		t.Fatalf("got %v", err)
	}
}
