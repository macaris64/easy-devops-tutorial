package grpcserver

import (
	"context"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	authv1 "easy-devops-tutorial/service-b/internal/genpb/auth/v1"
	"easy-devops-tutorial/service-b/internal/auth"
	"easy-devops-tutorial/service-b/internal/grpcauth"
	"easy-devops-tutorial/service-b/internal/model"
)

// AuthUnaryInterceptor enforces JWT on protected methods.
func AuthUnaryInterceptor(signer *auth.JWTSigner, public map[string]struct{}) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		if _, ok := public[info.FullMethod]; ok {
			return handler(ctx, req)
		}
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, status.Error(codes.Unauthenticated, "missing metadata")
		}
		vals := md.Get("authorization")
		if len(vals) == 0 {
			return nil, status.Error(codes.Unauthenticated, "missing authorization")
		}
		uid, roles, err := signer.ParseAuthorizationBearer(vals[0])
		if err != nil {
			return nil, status.Error(codes.Unauthenticated, "invalid token")
		}
		ctx = grpcauth.WithClaims(ctx, &grpcauth.Claims{UserID: uid, Roles: roles})
		return handler(ctx, req)
	}
}

// PublicGRPCMethods are callable without a JWT.
func PublicGRPCMethods() map[string]struct{} {
	return map[string]struct{}{
		authv1.AuthService_Register_FullMethodName:       {},
		authv1.AuthService_Login_FullMethodName:          {},
		authv1.AuthService_ForgotPassword_FullMethodName: {},
		authv1.AuthService_ResetPassword_FullMethodName:  {},
	}
}

func requireClaims(ctx context.Context) (*grpcauth.Claims, error) {
	c := grpcauth.ClaimsFromContext(ctx)
	if c == nil || c.UserID == "" {
		return nil, status.Error(codes.Unauthenticated, "unauthenticated")
	}
	return c, nil
}

func requireAdmin(c *grpcauth.Claims) error {
	if !hasRole(c.Roles, model.RoleAdmin) {
		return status.Error(codes.PermissionDenied, "admin role required")
	}
	return nil
}

func requireSelfOrAdmin(c *grpcauth.Claims, userID string) error {
	if c.UserID == userID {
		return nil
	}
	return requireAdmin(c)
}
