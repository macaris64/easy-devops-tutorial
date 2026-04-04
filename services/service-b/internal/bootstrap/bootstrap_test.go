package bootstrap

import (
	"errors"
	"net"
	"strings"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestRun_missingPostgresDSN(t *testing.T) {
	t.Setenv("POSTGRES_DSN", "")
	err := Run(&Options{SkipServe: true})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestRun_openDatabaseError(t *testing.T) {
	t.Setenv("POSTGRES_DSN", "any")
	t.Setenv("KAFKA_BROKERS", "")
	err := Run(&Options{
		SkipServe: true,
		OpenDB: func(string) (*gorm.DB, error) {
			return nil, errors.New("open failed")
		},
	})
	if err == nil || err.Error() != "open database: open failed" {
		t.Fatalf("got %v", err)
	}
}

func TestRun_serveReturnsError(t *testing.T) {
	t.Setenv("POSTGRES_DSN", "any")
	t.Setenv("KAFKA_BROKERS", "")
	err := Run(&Options{
		SkipServe: false,
		OpenDB: func(string) (*gorm.DB, error) {
			return gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
		},
		Listen: func(string, string) (net.Listener, error) {
			l, e := net.Listen("tcp", "127.0.0.1:0")
			if e != nil {
				return nil, e
			}
			_ = l.Close()
			return l, nil
		},
	})
	if err == nil || !strings.HasPrefix(err.Error(), "serve:") {
		t.Fatalf("expected serve error, got %v", err)
	}
}

func TestRun_listenError(t *testing.T) {
	t.Setenv("POSTGRES_DSN", "any")
	t.Setenv("KAFKA_BROKERS", "")
	err := Run(&Options{
		SkipServe: false,
		OpenDB: func(string) (*gorm.DB, error) {
			return gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
		},
		Listen: func(string, string) (net.Listener, error) {
			return nil, errors.New("listen failed")
		},
	})
	if err == nil || err.Error() != "listen: listen failed" {
		t.Fatalf("got %v", err)
	}
}

func TestRun_skipServe_withKafkaBrokers(t *testing.T) {
	t.Setenv("POSTGRES_DSN", "ignored")
	t.Setenv("KAFKA_BROKERS", "127.0.0.1:59092")
	t.Setenv("USER_CREATED_TOPIC", "user.created")
	t.Setenv("GRPC_LISTEN_ADDR", "127.0.0.1:0")
	err := Run(&Options{
		SkipServe: true,
		OpenDB: func(string) (*gorm.DB, error) {
			return gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
		},
		Listen: func(network, address string) (net.Listener, error) {
			return net.Listen(network, address)
		},
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestRun_skipServe_sqlite(t *testing.T) {
	t.Setenv("POSTGRES_DSN", "ignored")
	t.Setenv("KAFKA_BROKERS", "")
	t.Setenv("GRPC_LISTEN_ADDR", "127.0.0.1:0")
	err := Run(&Options{
		SkipServe: true,
		OpenDB: func(string) (*gorm.DB, error) {
			return gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
		},
		Listen: func(network, address string) (net.Listener, error) {
			return net.Listen(network, address)
		},
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestRun_skipServe_jwtFromEnv(t *testing.T) {
	t.Setenv("POSTGRES_DSN", "ignored")
	t.Setenv("KAFKA_BROKERS", "")
	t.Setenv("GRPC_LISTEN_ADDR", "127.0.0.1:0")
	t.Setenv("JWT_SECRET", "ci-secret")
	t.Setenv("JWT_ACCESS_TTL_SECONDS", "42")
	t.Setenv("JWT_REFRESH_TTL_HOURS", "3")
	err := Run(&Options{
		SkipServe: true,
		OpenDB: func(string) (*gorm.DB, error) {
			return gorm.Open(sqlite.Open("file:jwt_env?mode=memory"), &gorm.Config{})
		},
		Listen: func(network, address string) (net.Listener, error) {
			return net.Listen(network, address)
		},
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestRun_skipServe_jwtTTLInvalidUsesDefaults(t *testing.T) {
	t.Setenv("POSTGRES_DSN", "ignored")
	t.Setenv("KAFKA_BROKERS", "")
	t.Setenv("GRPC_LISTEN_ADDR", "127.0.0.1:0")
	t.Setenv("JWT_SECRET", "")
	t.Setenv("JWT_ACCESS_TTL_SECONDS", "not-int")
	t.Setenv("JWT_REFRESH_TTL_HOURS", "also-bad")
	err := Run(&Options{
		SkipServe: true,
		OpenDB: func(string) (*gorm.DB, error) {
			return gorm.Open(sqlite.Open("file:jwt_bad?mode=memory"), &gorm.Config{})
		},
		Listen: func(network, address string) (net.Listener, error) {
			return net.Listen(network, address)
		},
	})
	if err != nil {
		t.Fatal(err)
	}
}
