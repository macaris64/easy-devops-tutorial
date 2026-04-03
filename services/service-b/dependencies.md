# Service-B dependencies

| Module | Role |
|--------|------|
| `google.golang.org/grpc` | gRPC server |
| `google.golang.org/protobuf` | Protobuf runtime |
| `gorm.io/gorm` + `gorm.io/driver/postgres` | PostgreSQL ORM |
| `gorm.io/driver/sqlite` | In-memory SQLite for tests only |
| `github.com/segmentio/kafka-go` | `user.created` event producer |
| `github.com/google/uuid` | User primary keys |

Proto source: `services/common/protos/user.proto` (Docker builds regenerate `pb/`).
