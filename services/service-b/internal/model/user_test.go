package model

import "testing"

func TestUser_TableName(t *testing.T) {
	var u User
	if got := u.TableName(); got != "users" {
		t.Fatalf("TableName() = %q, want users", got)
	}
}
