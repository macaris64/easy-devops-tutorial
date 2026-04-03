package grpcauth

import (
	"context"
	"testing"
)

func TestClaimsContext(t *testing.T) {
	ctx := context.Background()
	if ClaimsFromContext(ctx) != nil {
		t.Fatal()
	}
	c := &Claims{UserID: "1", Roles: []string{"admin"}}
	ctx2 := WithClaims(ctx, c)
	got := ClaimsFromContext(ctx2)
	if got == nil || got.UserID != "1" || got.Roles[0] != "admin" {
		t.Fatalf("%+v", got)
	}
}
