package grpcserver

import "context"

// DomainEventPublisher emits JSON domain events to Kafka (optional; may be nil).
type DomainEventPublisher interface {
	PublishUserCreated(ctx context.Context, userID, username, email, source string) error
	PublishUserUpdated(ctx context.Context, userID, username, email string) error
	PublishUserDeleted(ctx context.Context, userID, username, email string) error
	PublishAuthLogin(ctx context.Context, userID, username string) error
	PublishAuthLogout(ctx context.Context, userID string) error
	PublishAuthPasswordResetRequested(ctx context.Context, userID string) error
	PublishAuthPasswordResetCompleted(ctx context.Context, userID string) error
	PublishRoleCreated(ctx context.Context, roleID, name string) error
	PublishRoleUpdated(ctx context.Context, roleID, name string) error
	PublishRoleDeleted(ctx context.Context, roleID, name string) error
	PublishUserRoleAssigned(ctx context.Context, userID, roleID string) error
	PublishUserRoleRemoved(ctx context.Context, userID, roleID string) error
}
