# easy-devops-tutorial

Polyglot microservices monorepo: **Service-A** (Node.js / Express + MongoDB), **Service-B** (Go / gRPC + PostgreSQL + Kafka), **Service-C** (Python / aiokafka). The API contract lives in `services/common/protos/user.proto`.

## Requirements

- Docker and Docker Compose v2 (`docker compose`) with `include` support (Compose 2.20+ recommended).
- Optional for local development: Go 1.22+, Node 20+, Python 3.11+.

## Quick start

1. Optional environment file:

   ```bash
   cp .env.example .env
   ```

2. Start infrastructure and all application services:

   ```bash
   docker compose up --build -d
   ```

   `docker-compose.yml` includes `docker-compose.infra.yml`. All containers attach to the **`app-network`** bridge network.

3. Smoke-test the HTTP API:

   ```bash
   curl -s http://localhost:3000/health
   curl -s -X POST http://localhost:3000/users \
     -H 'Content-Type: application/json' \
     -d '{"username":"alice","email":"alice@example.com"}'
   ```

4. **Kafka UI**: [http://localhost:8080](http://localhost:8080) — inspect the `user.created` topic.

5. **Kafka topic**: `kafka-init` in `docker-compose.infra.yml` creates `USER_CREATED_TOPIC` (default `user.created`). Service-B and Service-C start after it completes successfully.

6. **Service-C** logs (subscribe-all pattern `.*`):

   ```bash
   docker compose logs -f service-c
   ```

7. **End-to-end checks**: `GET /health` and `POST /users` succeed; users are stored in PostgreSQL; MongoDB collection `auditlogs` stores a row per `POST /users`; Service-B publishes JSON `user.created` events; Service-C logs consumed messages. After Kafka restarts you may briefly see `GroupCoordinatorNotAvailableError` in Service-C until the group coordinator is ready.

## CI (GitHub Actions)

Each service has its own workflow under `.github/workflows/`:

| Workflow       | Path triggers                                      |
|----------------|----------------------------------------------------|
| `service-a.yml`| `services/service-a/**`, shared proto changes      |
| `service-b.yml`| `services/service-b/**`, shared proto changes      |
| `service-c.yml`| `services/service-c/**`                            |

Jobs run **lint**, **build** (where applicable), **stylelint** (Service-A CSS only), **tests**, and enforce **≥90% coverage** (configured per stack).

### Local quality commands

**Service-A** (`services/service-a`):

```bash
npm ci
npm run lint          # ESLint
npm run lint:style    # Stylelint (src/**/*.css)
npm run build
npm run test:coverage # Jest, thresholds in jest.config.cjs
```

**Service-B** (`services/service-b`):

```bash
golangci-lint run ./...
go build -o /tmp/service-b .
bash scripts/check-coverage.sh   # go test ./internal/... total ≥90%
```

**Service-C** (`services/service-c`):

```bash
pip install ".[dev]"
ruff check src tests
ruff format --check src tests
pytest --cov=src --cov-report=term-missing
```

## Environment variables

Configure hosts and secrets via `.env` / `.env.example` (databases, Kafka, gRPC).

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | Service-A MongoDB connection string |
| `POSTGRES_*` | Postgres container settings in `docker-compose.infra.yml` |
| `POSTGRES_DSN` | Service-B GORM DSN (wired in Compose) |
| `KAFKA_BROKERS` | e.g. `kafka:9092` on the Docker network |
| `USER_CREATED_TOPIC` | Default `user.created` |
| `GRPC_HOST` / `GRPC_PORT` | Service-A → Service-B gRPC |

## Bitnami images

Kafka and Zookeeper use **`public.ecr.aws/bitnami/...`** because some environments cannot pull `docker.io/bitnami/*`. You may switch tags to `docker.io/bitnami/...` if preferred.

## Protobuf

Service-B’s Docker build runs `protoc` against `services/common/protos/`. Checked-in files under `services/service-b/pb/` help local IDE builds. Change contracts in `services/common/protos/` first.

## Layout

- `services/service-a` — REST gateway
- `services/service-b` — gRPC + PostgreSQL + Kafka producer
- `services/service-c` — Kafka consumer worker
- `services/common/protos` — shared `.proto` files

See each service’s `dependencies.md` for dependency notes.
