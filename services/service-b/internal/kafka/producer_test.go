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

func TestProducer_PublishUserCreated_success(t *testing.T) {
	mw := &mockWriter{}
	p := &Producer{writer: mw, topic: "user.created"}
	ctx := context.Background()
	if err := p.PublishUserCreated(ctx, "u1", "alice", "a@x.com"); err != nil {
		t.Fatal(err)
	}
	if len(mw.msgs) != 1 {
		t.Fatalf("expected 1 message, got %d", len(mw.msgs))
	}
	var payload UserCreatedPayload
	if err := json.Unmarshal(mw.msgs[0].Value, &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Event != "user.created" || payload.UserID != "u1" || payload.Username != "alice" || payload.Email != "a@x.com" {
		t.Fatalf("unexpected payload: %+v", payload)
	}
	if string(mw.msgs[0].Key) != "u1" {
		t.Fatalf("key = %q", mw.msgs[0].Key)
	}
}

func TestProducer_PublishUserCreated_writeError(t *testing.T) {
	mw := &mockWriter{err: errors.New("boom")}
	p := &Producer{writer: mw, topic: "t"}
	if err := p.PublishUserCreated(context.Background(), "u", "a", "b"); err == nil {
		t.Fatal("expected error")
	}
}

func TestProducer_Close(t *testing.T) {
	mw := &mockWriter{}
	p := &Producer{writer: mw, topic: "t"}
	if err := p.Close(); err != nil {
		t.Fatal(err)
	}
}

func TestNewProducer(t *testing.T) {
	p := NewProducer([]string{"localhost:9092"}, "topic-x")
	if p == nil || p.topic != "topic-x" {
		t.Fatalf("unexpected producer %+v", p)
	}
	_ = p.Close()
}

func TestUserCreatedPayload_JSON(t *testing.T) {
	ts := time.Date(2020, 1, 2, 3, 4, 5, 0, time.UTC)
	b, err := json.Marshal(UserCreatedPayload{
		Event: "user.created", UserID: "1", Username: "u", Email: "e", Timestamp: ts,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(b) < 20 {
		t.Fatalf("short json: %s", b)
	}
}
