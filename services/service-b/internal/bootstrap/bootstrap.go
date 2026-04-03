package bootstrap

import (
	"fmt"
	"log"
	"net"
	"os"
	"strings"

	"google.golang.org/grpc"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	pb "easy-devops-tutorial/service-b/pb"
	"easy-devops-tutorial/service-b/internal/grpcserver"
	kafkaprod "easy-devops-tutorial/service-b/internal/kafka"
	"easy-devops-tutorial/service-b/internal/model"
)

// Options configures Run; nil-safe defaults are applied for production.
type Options struct {
	// OpenDB opens the database (defaults to PostgreSQL via GORM).
	OpenDB func(dsn string) (*gorm.DB, error)
	// Listen creates the TCP listener (defaults to net.Listen).
	Listen func(network, address string) (net.Listener, error)
	// SkipServe exits after wiring the server (for unit tests).
	SkipServe bool
}

// Main is the process entrypoint.
func Main() {
	if err := Run(nil); err != nil {
		log.Fatal(err)
	}
}

// Run starts the gRPC server and blocks until Serve returns (unless SkipServe).
func Run(opts *Options) error {
	if opts == nil {
		opts = &Options{}
	}
	if opts.OpenDB == nil {
		opts.OpenDB = openPostgres
	}
	if opts.Listen == nil {
		opts.Listen = net.Listen
	}

	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		return fmt.Errorf("POSTGRES_DSN is required")
	}
	db, err := opts.OpenDB(dsn)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	if migrateErr := db.AutoMigrate(&model.User{}); migrateErr != nil {
		return fmt.Errorf("migrate: %w", migrateErr)
	}

	var producer *kafkaprod.Producer
	brokers := strings.Split(os.Getenv("KAFKA_BROKERS"), ",")
	for i := range brokers {
		brokers[i] = strings.TrimSpace(brokers[i])
	}
	topic := os.Getenv("USER_CREATED_TOPIC")
	if topic == "" {
		topic = "user.created"
	}
	if len(brokers) > 0 && brokers[0] != "" {
		producer = kafkaprod.NewProducer(brokers, topic)
		defer func() { _ = producer.Close() }()
	} else {
		log.Println("KAFKA_BROKERS empty — Kafka producer disabled")
	}

	addr := os.Getenv("GRPC_LISTEN_ADDR")
	if addr == "" {
		addr = ":50051"
	}
	lis, err := opts.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("listen: %w", err)
	}
	s := grpc.NewServer()
	pb.RegisterUserServiceServer(s, grpcserver.NewUserServer(db, producer))

	log.Printf("gRPC server listening on %s", addr)
	if opts.SkipServe {
		_ = lis.Close()
		return nil
	}
	if err := s.Serve(lis); err != nil {
		return fmt.Errorf("serve: %w", err)
	}
	return nil
}

func openPostgres(dsn string) (*gorm.DB, error) {
	return gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
}
