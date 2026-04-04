package grpcserver

import (
	"log"
	"os"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// kafkaPublishError logs a failed Kafka publish; in KAFKA_STRICT=1 returns gRPC Internal.
func kafkaPublishError(contextLabel string, pubErr error) error {
	if pubErr == nil {
		return nil
	}
	log.Printf("Kafka publish warning (%s): %v", contextLabel, pubErr)
	if os.Getenv("KAFKA_STRICT") == "1" {
		return status.Error(codes.Internal, "failed to publish event")
	}
	return nil
}
