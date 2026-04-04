package bootstrap

import (
	"fmt"
	"log"
	"net"
	"os"
	"strconv"
	"strings"
	"time"

	"google.golang.org/grpc"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	authv1 "easy-devops-tutorial/service-b/internal/genpb/auth/v1"
	rolev1 "easy-devops-tutorial/service-b/internal/genpb/role/v1"
	userv1 "easy-devops-tutorial/service-b/internal/genpb/user/v1"
	"easy-devops-tutorial/service-b/internal/auth"
	"easy-devops-tutorial/service-b/internal/grpcserver"
	kafkaprod "easy-devops-tutorial/service-b/internal/kafka"
	"easy-devops-tutorial/service-b/internal/model"
	"easy-devops-tutorial/service-b/internal/seed"
)

// Options configures Run; nil-safe defaults are applied for production.
type Options struct {
	OpenDB    func(dsn string) (*gorm.DB, error)
	Listen    func(network, address string) (net.Listener, error)
	SkipServe bool
}

// Main is the process entrypoint.
func Main() {
	if err := Run(nil); err != nil {
		log.Fatal(err)
	}
}

func jwtSecret() string {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		log.Println("warning: JWT_SECRET empty — using insecure dev default")
		return "insecure-dev-jwt-secret-change-me"
	}
	return s
}

func accessTTL() time.Duration {
	sec := int64(900)
	if v := os.Getenv("JWT_ACCESS_TTL_SECONDS"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil && n > 0 {
			sec = n
		}
	}
	return time.Duration(sec) * time.Second
}

func refreshTTL() time.Duration {
	h := int64(168)
	if v := os.Getenv("JWT_REFRESH_TTL_HOURS"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil && n > 0 {
			h = n
		}
	}
	return time.Duration(h) * time.Hour
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
	if migrateErr := db.AutoMigrate(
		&model.User{},
		&model.Role{},
		&model.RefreshToken{},
		&model.PasswordResetToken{},
	); migrateErr != nil {
		return fmt.Errorf("migrate: %w", migrateErr)
	}
	if seedErr := seed.EnsureRoles(db); seedErr != nil {
		return fmt.Errorf("seed roles: %w", seedErr)
	}
	if seedErr := seed.BootstrapAdmin(db); seedErr != nil {
		return fmt.Errorf("bootstrap admin: %w", seedErr)
	}
	if seedErr := seed.EnsureDemoUser(db); seedErr != nil {
		return fmt.Errorf("seed demo user: %w", seedErr)
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

	signer := auth.NewJWTSigner(jwtSecret(), "service-b", "service-b")
	access := accessTTL()
	refresh := refreshTTL()

	userSrv := grpcserver.NewUserServer(db, producer)
	authSrv := grpcserver.NewAuthServer(db, signer, access, refresh, producer)
	roleSrv := grpcserver.NewRoleServer(db)

	intercept := grpcserver.AuthUnaryInterceptor(signer, grpcserver.PublicGRPCMethods())
	s := grpc.NewServer(grpc.ChainUnaryInterceptor(intercept))

	userv1.RegisterUserServiceServer(s, userSrv)
	authv1.RegisterAuthServiceServer(s, authSrv)
	rolev1.RegisterRoleServiceServer(s, roleSrv)

	addr := os.Getenv("GRPC_LISTEN_ADDR")
	if addr == "" {
		addr = ":50051"
	}
	lis, err := opts.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("listen: %w", err)
	}

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
