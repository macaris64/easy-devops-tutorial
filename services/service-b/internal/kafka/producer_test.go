package kafka

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	kafkago "github.com/segmentio/kafka-go"
)

type mockWriter struct {
	msgs []kafkago.Message
	err  error
}

func (m *mockWriter) WriteMessages(ctx context.Context, msgs ...kafkago.Message) error {
	if m.err != nil {
		return m.err
	}
	m.msgs = append(m.msgs, msgs...)
	return nil
}

func (m *mockWriter) Close() error {
	return nil
}

func testProducer(userW, roleW MessageWriter, userTopic, roleTopic string) *Producer {
	return &Producer{
		userWriter: userW,
		roleWriter: roleW,
		userTopic:  userTopic,
		roleTopic:  roleTopic,
	}
}

func TestProducer_PublishUserCreated_success(t *testing.T) {
	userMw := &mockWriter{}
	roleMw := &mockWriter{}
	p := testProducer(userMw, roleMw, "user.events", "role.events")
	ctx := context.Background()
	if err := p.PublishUserCreated(ctx, "u1", "alice", "a@x.com", "admin"); err != nil {
		t.Fatal(err)
	}
	if len(userMw.msgs) != 1 || len(roleMw.msgs) != 0 {
		t.Fatalf("user msgs=%d role msgs=%d", len(userMw.msgs), len(roleMw.msgs))
	}
	var payload UserCreatedPayload
	if err := json.Unmarshal(userMw.msgs[0].Value, &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Event != "user" || payload.Data != "user.created" || payload.UserID != "u1" || payload.Username != "alice" || payload.Email != "a@x.com" {
		t.Fatalf("unexpected payload: %+v", payload)
	}
	if payload.Source != "admin" {
		t.Fatalf("source = %q", payload.Source)
	}
	if string(userMw.msgs[0].Key) != "u1" {
		t.Fatalf("key = %q", userMw.msgs[0].Key)
	}
}

func TestProducer_PublishUserCreated_registrationSource(t *testing.T) {
	userMw := &mockWriter{}
	p := testProducer(userMw, &mockWriter{}, "user.events", "role.events")
	if err := p.PublishUserCreated(context.Background(), "u", "a", "b", "registration"); err != nil {
		t.Fatal(err)
	}
	var payload UserCreatedPayload
	_ = json.Unmarshal(userMw.msgs[0].Value, &payload)
	if payload.Source != "registration" {
		t.Fatalf("source = %q", payload.Source)
	}
}

func TestProducer_PublishUserCreated_writeError(t *testing.T) {
	userMw := &mockWriter{err: errors.New("boom")}
	p := testProducer(userMw, &mockWriter{}, "user.events", "role.events")
	if err := p.PublishUserCreated(context.Background(), "u", "a", "b", "admin"); err == nil {
		t.Fatal("expected error")
	}
}

func TestProducer_PublishAuthLogin(t *testing.T) {
	userMw := &mockWriter{}
	p := testProducer(userMw, &mockWriter{}, "user.events", "role.events")
	if err := p.PublishAuthLogin(context.Background(), "uid", "bob"); err != nil {
		t.Fatal(err)
	}
	var m map[string]interface{}
	if err := json.Unmarshal(userMw.msgs[0].Value, &m); err != nil {
		t.Fatal(err)
	}
	if m["event"] != "user" || m["data"] != "user.login" || m["user_id"] != "uid" || m["username"] != "bob" {
		t.Fatalf("%v", m)
	}
}

func TestProducer_PublishRoleCreated(t *testing.T) {
	userMw := &mockWriter{}
	roleMw := &mockWriter{}
	p := testProducer(userMw, roleMw, "user.events", "role.events")
	if err := p.PublishRoleCreated(context.Background(), "rid", "editor"); err != nil {
		t.Fatal(err)
	}
	if len(userMw.msgs) != 0 || len(roleMw.msgs) != 1 {
		t.Fatalf("user msgs=%d role msgs=%d", len(userMw.msgs), len(roleMw.msgs))
	}
	var m map[string]interface{}
	_ = json.Unmarshal(roleMw.msgs[0].Value, &m)
	if m["event"] != "role" || m["data"] != "role.created" || m["role_id"] != "rid" || m["name"] != "editor" {
		t.Fatalf("%v", m)
	}
}

func TestProducer_PublishUserRoleAssigned(t *testing.T) {
	userMw := &mockWriter{}
	p := testProducer(userMw, &mockWriter{}, "user.events", "role.events")
	if err := p.PublishUserRoleAssigned(context.Background(), "u1", "r1"); err != nil {
		t.Fatal(err)
	}
	var m map[string]interface{}
	_ = json.Unmarshal(userMw.msgs[0].Value, &m)
	if m["event"] != "user" || m["data"] != "user.role_assigned" {
		t.Fatalf("%v", m)
	}
}

func TestProducer_Close(t *testing.T) {
	p := testProducer(&mockWriter{}, &mockWriter{}, "u", "r")
	if err := p.Close(); err != nil {
		t.Fatal(err)
	}
}

func TestNewProducer(t *testing.T) {
	p := NewProducer([]string{"localhost:9092"}, "user.events", "role.events")
	if p == nil {
		t.Fatal("nil producer")
	}
	_ = p.Close()
}

func TestProducer_publishMethods_hitRoleAndUserWriters(t *testing.T) {
	userMw := &mockWriter{}
	roleMw := &mockWriter{}
	p := testProducer(userMw, roleMw, "user.events", "role.events")
	ctx := context.Background()
	tests := []struct {
		name string
		run  func() error
	}{
		{"PublishUserUpdated", func() error { return p.PublishUserUpdated(ctx, "u", "a", "e") }},
		{"PublishUserDeleted", func() error { return p.PublishUserDeleted(ctx, "u", "a", "e") }},
		{"PublishAuthLogout", func() error { return p.PublishAuthLogout(ctx, "u") }},
		{"PublishAuthPasswordResetRequested", func() error { return p.PublishAuthPasswordResetRequested(ctx, "u") }},
		{"PublishAuthPasswordResetCompleted", func() error { return p.PublishAuthPasswordResetCompleted(ctx, "u") }},
		{"PublishRoleUpdated", func() error { return p.PublishRoleUpdated(ctx, "r", "n") }},
		{"PublishRoleDeleted", func() error { return p.PublishRoleDeleted(ctx, "r", "n") }},
		{"PublishUserRoleRemoved", func() error { return p.PublishUserRoleRemoved(ctx, "u", "r") }},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if err := tc.run(); err != nil {
				t.Fatal(err)
			}
		})
	}
	if len(userMw.msgs) != 6 || len(roleMw.msgs) != 2 {
		t.Fatalf("user=%d role=%d", len(userMw.msgs), len(roleMw.msgs))
	}
}

func TestUserCreatedPayload_JSON(t *testing.T) {
	ts := time.Date(2020, 1, 2, 3, 4, 5, 0, time.UTC)
	b, err := json.Marshal(UserCreatedPayload{
		Event: "user", Data: "user.created", UserID: "1", Username: "u", Email: "e", Source: "admin", Timestamp: ts,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(b) < 20 {
		t.Fatalf("short json: %s", b)
	}
}
