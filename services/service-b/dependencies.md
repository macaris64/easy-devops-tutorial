# Service-B dependencies

| Module | Role |
|--------|------|
| `google.golang.org/grpc` | gRPC server |
| `google.golang.org/protobuf` | Protobuf runtime |
| `gorm.io/gorm` + `gorm.io/driver/postgres` | PostgreSQL ORM |
| `gorm.io/driver/sqlite` | In-memory SQLite for tests only |
| `github.com/segmentio/kafka-go` | Domain events to `user.events` / `role.events` |
| `github.com/google/uuid` | User primary keys |

Proto source: `services/common/protos/**` (generated Go lives under `internal/genpb/`). A legacy `pb/` directory at the module root is unused—delete it if still present (e.g. files owned by another user from Docker).
