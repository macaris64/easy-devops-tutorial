package grpcauth

import (
	"context"
)

type ctxKey int

const claimsKey ctxKey = 1

// Claims carries authenticated user id and role names from JWT.
type Claims struct {
	UserID string
	Roles  []string
}

// WithClaims attaches claims to context (set by interceptor).
func WithClaims(ctx context.Context, c *Claims) context.Context {
	return context.WithValue(ctx, claimsKey, c)
}

// ClaimsFromContext returns claims or nil if unauthenticated.
func ClaimsFromContext(ctx context.Context) *Claims {
	if v := ctx.Value(claimsKey); v != nil {
		if c, ok := v.(*Claims); ok {
			return c
		}
	}
	return nil
}
