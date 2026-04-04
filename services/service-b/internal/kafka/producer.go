package kafka

import (
	"context"
	"encoding/json"
	"log"
	"time"

	kafkago "github.com/segmentio/kafka-go"
)

// UserCreatedPayload is the JSON body for aggregate "user", data "user.created".
type UserCreatedPayload struct {
	Event     string    `json:"event"`
	Data      string    `json:"data"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Source    string    `json:"source,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// MessageWriter abstracts kafka-go for tests.
type MessageWriter interface {
	WriteMessages(ctx context.Context, msgs ...kafkago.Message) error
	Close() error
}

// Producer publishes domain events to Kafka (user.* payloads to userTopic, role.* to roleTopic).
type Producer struct {
	userWriter MessageWriter
	roleWriter MessageWriter
	userTopic  string
	roleTopic  string
}

// NewProducer builds a producer with two writers: user events and role events topics.
func NewProducer(brokers []string, userTopic, roleTopic string) *Producer {
	addr := kafkago.TCP(brokers...)
	return &Producer{
		userWriter: &kafkago.Writer{
			Addr: addr, Topic: userTopic, Balancer: &kafkago.LeastBytes{},
			RequiredAcks: kafkago.RequireOne, AllowAutoTopicCreation: true,
		},
		roleWriter: &kafkago.Writer{
			Addr: addr, Topic: roleTopic, Balancer: &kafkago.LeastBytes{},
			RequiredAcks: kafkago.RequireOne, AllowAutoTopicCreation: true,
		},
		userTopic: userTopic,
		roleTopic: roleTopic,
	}
}

// write sends one record to the given writer. Uses a fresh timeout context so gRPC client disconnect or
// cancelled request context cannot abort the broker write after the DB mutation succeeded.
func (p *Producer) write(_ context.Context, w MessageWriter, topic string, key string, logLabel string, v interface{}) error {
	body, err := json.Marshal(v)
	if err != nil {
		return err
	}
	msg := kafkago.Message{Key: []byte(key), Value: body}
	wctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := w.WriteMessages(wctx, msg); err != nil {
		log.Printf("kafka write error: data=%s topic=%s err=%v", logLabel, topic, err)
		return err
	}
	log.Printf("kafka event sent: topic=%s data=%s key=%q", topic, logLabel, key)
	return nil
}

func (p *Producer) writeUserEvent(ctx context.Context, key string, logLabel string, v interface{}) error {
	return p.write(ctx, p.userWriter, p.userTopic, key, logLabel, v)
}

func (p *Producer) writeRoleEvent(ctx context.Context, key string, logLabel string, v interface{}) error {
	return p.write(ctx, p.roleWriter, p.roleTopic, key, logLabel, v)
}

// PublishUserCreated emits user + user.created (source: "registration" or "admin").
func (p *Producer) PublishUserCreated(ctx context.Context, userID, username, email, source string) error {
	payload := UserCreatedPayload{
		Event:     "user",
		Data:      "user.created",
		UserID:    userID,
		Username:  username,
		Email:     email,
		Source:    source,
		Timestamp: time.Now().UTC(),
	}
	return p.writeUserEvent(ctx, userID, "user.created", payload)
}

// PublishUserUpdated emits user + user.updated.
func (p *Producer) PublishUserUpdated(ctx context.Context, userID, username, email string) error {
	type payload struct {
		Event     string    `json:"event"`
		Data      string    `json:"data"`
		UserID    string    `json:"user_id"`
		Username  string    `json:"username"`
		Email     string    `json:"email"`
		Timestamp time.Time `json:"timestamp"`
	}
	return p.writeUserEvent(ctx, userID, "user.updated", payload{
		Event: "user", Data: "user.updated", UserID: userID, Username: username, Email: email,
		Timestamp: time.Now().UTC(),
	})
}

// PublishUserDeleted emits user + user.deleted.
func (p *Producer) PublishUserDeleted(ctx context.Context, userID, username, email string) error {
	type payload struct {
		Event     string    `json:"event"`
		Data      string    `json:"data"`
		UserID    string    `json:"user_id"`
		Username  string    `json:"username"`
		Email     string    `json:"email"`
		Timestamp time.Time `json:"timestamp"`
	}
	return p.writeUserEvent(ctx, userID, "user.deleted", payload{
		Event: "user", Data: "user.deleted", UserID: userID, Username: username, Email: email,
		Timestamp: time.Now().UTC(),
	})
}

// PublishAuthLogin emits user + user.login.
func (p *Producer) PublishAuthLogin(ctx context.Context, userID, username string) error {
	type payload struct {
		Event     string    `json:"event"`
		Data      string    `json:"data"`
		UserID    string    `json:"user_id"`
		Username  string    `json:"username"`
		Timestamp time.Time `json:"timestamp"`
	}
	return p.writeUserEvent(ctx, userID, "user.login", payload{
		Event: "user", Data: "user.login", UserID: userID, Username: username, Timestamp: time.Now().UTC(),
	})
}

// PublishAuthLogout emits user + user.logout.
func (p *Producer) PublishAuthLogout(ctx context.Context, userID string) error {
	type payload struct {
		Event     string    `json:"event"`
		Data      string    `json:"data"`
		UserID    string    `json:"user_id"`
		Timestamp time.Time `json:"timestamp"`
	}
	return p.writeUserEvent(ctx, userID, "user.logout", payload{
		Event: "user", Data: "user.logout", UserID: userID, Timestamp: time.Now().UTC(),
	})
}

// PublishAuthPasswordResetRequested emits user + user.password_reset_requested.
func (p *Producer) PublishAuthPasswordResetRequested(ctx context.Context, userID string) error {
	type payload struct {
		Event     string    `json:"event"`
		Data      string    `json:"data"`
		UserID    string    `json:"user_id"`
		Timestamp time.Time `json:"timestamp"`
	}
	return p.writeUserEvent(ctx, userID, "user.password_reset_requested", payload{
		Event: "user", Data: "user.password_reset_requested", UserID: userID, Timestamp: time.Now().UTC(),
	})
}

// PublishAuthPasswordResetCompleted emits user + user.password_reset_completed.
func (p *Producer) PublishAuthPasswordResetCompleted(ctx context.Context, userID string) error {
	type payload struct {
		Event     string    `json:"event"`
		Data      string    `json:"data"`
		UserID    string    `json:"user_id"`
		Timestamp time.Time `json:"timestamp"`
	}
	return p.writeUserEvent(ctx, userID, "user.password_reset_completed", payload{
		Event: "user", Data: "user.password_reset_completed", UserID: userID, Timestamp: time.Now().UTC(),
	})
}

// PublishRoleCreated emits role + role.created.
func (p *Producer) PublishRoleCreated(ctx context.Context, roleID, name string) error {
	type payload struct {
		Event     string    `json:"event"`
		Data      string    `json:"data"`
		RoleID    string    `json:"role_id"`
		Name      string    `json:"name"`
		Timestamp time.Time `json:"timestamp"`
	}
	return p.writeRoleEvent(ctx, roleID, "role.created", payload{
		Event: "role", Data: "role.created", RoleID: roleID, Name: name, Timestamp: time.Now().UTC(),
	})
}

// PublishRoleUpdated emits role + role.updated.
func (p *Producer) PublishRoleUpdated(ctx context.Context, roleID, name string) error {
	type payload struct {
		Event     string    `json:"event"`
		Data      string    `json:"data"`
		RoleID    string    `json:"role_id"`
		Name      string    `json:"name"`
		Timestamp time.Time `json:"timestamp"`
	}
	return p.writeRoleEvent(ctx, roleID, "role.updated", payload{
		Event: "role", Data: "role.updated", RoleID: roleID, Name: name, Timestamp: time.Now().UTC(),
	})
}

// PublishRoleDeleted emits role + role.deleted.
func (p *Producer) PublishRoleDeleted(ctx context.Context, roleID, name string) error {
	type payload struct {
		Event     string    `json:"event"`
		Data      string    `json:"data"`
		RoleID    string    `json:"role_id"`
		Name      string    `json:"name"`
		Timestamp time.Time `json:"timestamp"`
	}
	return p.writeRoleEvent(ctx, roleID, "role.deleted", payload{
		Event: "role", Data: "role.deleted", RoleID: roleID, Name: name, Timestamp: time.Now().UTC(),
	})
}

// PublishUserRoleAssigned emits user + user.role_assigned.
func (p *Producer) PublishUserRoleAssigned(ctx context.Context, userID, roleID string) error {
	type payload struct {
		Event     string    `json:"event"`
		Data      string    `json:"data"`
		UserID    string    `json:"user_id"`
		RoleID    string    `json:"role_id"`
		Timestamp time.Time `json:"timestamp"`
	}
	key := userID + ":" + roleID
	return p.writeUserEvent(ctx, key, "user.role_assigned", payload{
		Event: "user", Data: "user.role_assigned", UserID: userID, RoleID: roleID, Timestamp: time.Now().UTC(),
	})
}

// PublishUserRoleRemoved emits user + user.role_removed.
func (p *Producer) PublishUserRoleRemoved(ctx context.Context, userID, roleID string) error {
	type payload struct {
		Event     string    `json:"event"`
		Data      string    `json:"data"`
		UserID    string    `json:"user_id"`
		RoleID    string    `json:"role_id"`
		Timestamp time.Time `json:"timestamp"`
	}
	key := userID + ":" + roleID
	return p.writeUserEvent(ctx, key, "user.role_removed", payload{
		Event: "user", Data: "user.role_removed", UserID: userID, RoleID: roleID, Timestamp: time.Now().UTC(),
	})
}

// Close releases both writers.
func (p *Producer) Close() error {
	var errU, errR error
	if p.userWriter != nil {
		errU = p.userWriter.Close()
	}
	if p.roleWriter != nil {
		errR = p.roleWriter.Close()
	}
	if errU != nil {
		return errU
	}
	return errR
}
