package grpcserver

import (
	"easy-devops-tutorial/service-b/internal/model"
	userv1 "easy-devops-tutorial/service-b/internal/genpb/user/v1"
	rolev1 "easy-devops-tutorial/service-b/internal/genpb/role/v1"
)

func roleNames(u *model.User) []string {
	if u == nil {
		return nil
	}
	out := make([]string, 0, len(u.Roles))
	for _, r := range u.Roles {
		out = append(out, r.Name)
	}
	return out
}

func userToPB(u *model.User) *userv1.User {
	if u == nil {
		return nil
	}
	return &userv1.User{
		Id:       u.ID,
		Username: u.Username,
		Email:    u.Email,
		Roles:    roleNames(u),
	}
}

func roleToPB(r *model.Role) *rolev1.Role {
	if r == nil {
		return nil
	}
	return &rolev1.Role{Id: r.ID, Name: r.Name}
}

func hasRole(roles []string, want string) bool {
	for _, r := range roles {
		if r == want {
			return true
		}
	}
	return false
}
