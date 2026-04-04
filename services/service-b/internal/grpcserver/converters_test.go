package grpcserver

import (
	"testing"

	"easy-devops-tutorial/service-b/internal/model"
)

func TestRoleNames_nil(t *testing.T) {
	if roleNames(nil) != nil {
		t.Fatal()
	}
}

func TestUserToPB_nil(t *testing.T) {
	if userToPB(nil) != nil {
		t.Fatal()
	}
}

func TestRoleToPB_nil(t *testing.T) {
	if roleToPB(nil) != nil {
		t.Fatal()
	}
}

func TestUserToPB_withRoles(t *testing.T) {
	u := &model.User{
		ID: "1", Username: "x", Email: "x@x",
		Roles: []model.Role{{Name: "user"}, {Name: "admin"}},
	}
	pb := userToPB(u)
	if len(pb.Roles) != 2 || pb.Roles[0] != "user" || pb.Roles[1] != "admin" {
		t.Fatalf("%v", pb.Roles)
	}
}
