package kafka

import (
	"context"
	"encoding/json"
	"log"
	"time"

	kafkago "github.com/segmentio/kafka-go"
)

// UserCreatedPayload is the JSON body for the user.created domain event.
type UserCreatedPayload struct {
	Event     string    `json:"event"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Timestamp time.Time `json:"timestamp"`
}

// MessageWriter abstracts kafka-go for tests.
type MessageWriter interface {
	WriteMessages(ctx context.Context, msgs ...kafkago.Message) error
	Close() error
}

// Producer publishes domain events to Kafka.
type Producer struct {
	writer MessageWriter
	topic  string
}

// NewProducer builds a producer backed by segmentio/kafka-go.
func NewProducer(brokers []string, topic string) *Producer {
	w := &kafkago.Writer{
		Addr:         kafkago.TCP(brokers...),
		Topic:        topic,
		Balancer:     &kafkago.LeastBytes{},
		RequiredAcks: kafkago.RequireAll,
	}
	return &Producer{writer: w, topic: topic}
}

// PublishUserCreated emits a user.created event.
func (p *Producer) PublishUserCreated(ctx context.Context, userID, username, email string) error {
	payload := UserCreatedPayload{
		Event:     "user.created",
		UserID:    userID,
		Username:  username,
		Email:     email,
		Timestamp: time.Now().UTC(),
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	msg := kafkago.Message{
		Key:   []byte(userID),
		Value: body,
	}
	if err := p.writer.WriteMessages(ctx, msg); err != nil {
		log.Printf("kafka write error: %v", err)
		return err
	}
	log.Printf("kafka event sent: topic=%s event=user.created user_id=%s", p.topic, userID)
	return nil
}

// Close releases the writer.
func (p *Producer) Close() error {
	return p.writer.Close()
}
