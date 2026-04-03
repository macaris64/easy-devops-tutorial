# easy-devops-tutorial

Polyglot microservices monorepo: **Service-A** (Node.js / Express + MongoDB), **Service-B** (Go / gRPC + PostgreSQL + Kafka), **Service-C** (Python / aiokafka). The API contract lives in `services/common/protos/user/v1/user.proto`.

## Local URLs and ports

After `docker compose up`, services publish to **localhost** unless you change the mapped ports in `.env` (variable names in parentheses).

**Examples:** [http://localhost:3000](http://localhost:3000), [http://localhost:4173](http://localhost:4173), [http://localhost:6006](http://localhost:6006), [http://localhost:6007](http://localhost:6007), [http://localhost:8080](http://localhost:8080), etc. (defaults; full mapping below).

### Application services

| Application | Address | Notes |
|-------------|---------|--------|
| **Service-A** (REST API) | [http://localhost:3000](http://localhost:3000) | HTTP; `SERVICE_A_HTTP_PORT` |
| **Service-B** (gRPC) | `localhost:50051` | gRPC only; `SERVICE_B_GRPC_PORT` |
| **Service-C** (Kafka consumer) | — | No host port; runs on `app-network` only |
| **frontend-a** (admin SPA) | [http://localhost:4173](http://localhost:4173) | Proxies `/api` to Service-A in Docker; `FRONTEND_A_PORT` |
| **frontend-b** (log panel Storybook) | [http://localhost:6006](http://localhost:6006) | `FRONTEND_B_PORT` |
| **frontend-c** (user panel Storybook) | [http://localhost:6007](http://localhost:6007) | `FRONTEND_C_PORT` |

### Infrastructure (`docker-compose.infra.yml`)

| Service | Address | Env override |
|---------|---------|--------------|
| **MongoDB** | `localhost:27017` | `MONGO_PORT` |
| **PostgreSQL** | `localhost:5432` | `POSTGRES_PORT` |
| **Zookeeper** | `localhost:2181` | `ZOOKEEPER_PORT` |
| **Kafka** (external listener) | `localhost:9094` | `KAFKA_EXTERNAL_PORT` (containers use `kafka:9092` on the bridge) |
| **Kafka UI** | [http://localhost:8080](http://localhost:8080) | `KAFKA_UI_PORT` |

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

### Docker Hub rate limit (`toomanyrequests: Rate exceeded`)

Docker Hub caps anonymous image pulls per IP. This stack pulls **Kafka UI** from Docker Hub; MongoDB and PostgreSQL default to **AWS ECR Public** mirrors of the official library images (same as the Bitnami Kafka/Zookeeper images) so a typical `docker compose up` only needs one Hub pull for Kafka UI.

If pulls still fail:

1. Log in to Docker Hub (higher limits for authenticated users): `docker login`
2. Wait for the rate limit window to reset (often six hours), then run `docker compose pull` again
3. Optionally set `MONGO_IMAGE` / `POSTGRES_IMAGE` / `KAFKA_UI_IMAGE` in `.env` if you use a private mirror (see `.env.example`)

## CI (GitHub Actions)

Each service has its own workflow under `.github/workflows/`:

| Workflow       | Path triggers                                      |
|----------------|----------------------------------------------------|
| `proto.yml`    | `services/common/**` (Buf lint, build, format, breaking on PRs) |
| `service-a.yml`| `services/service-a/**`, shared proto changes      |
| `service-b.yml`| `services/service-b/**`, shared proto changes      |
| `service-c.yml`| `services/service-c/**`                            |
| `frontends.yml`| `services/frontend-a/**`, `services/frontend-b/**`, `services/frontend-c/**` |

Jobs run **lint**, **build** (where applicable), **stylelint** (Service-A CSS only), **tests**, and enforce **≥90% coverage** for backend services and **≥80%** for the React frontends (`frontends.yml`).

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

**Frontends** — build `frontend-b` and `frontend-c` before installing `frontend-a` (file dependencies). From each `services/frontend-*` directory:

```bash
npm ci
npm run lint
npm run build          # library or SPA
npm run test:coverage  # Vitest, ≥80% thresholds
# Storybook (frontend-b / frontend-c only):
npm run build-storybook
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

[Buf](https://buf.build) enforces lint, formatting, and builds in CI (`proto.yml`). Locally, install the Buf CLI and from `services/common` run `bash scripts/validate-protos.sh` (same checks as CI except breaking detection).

## Layout

- `services/service-a` — REST gateway
- `services/service-b` — gRPC + PostgreSQL + Kafka producer
- `services/service-c` — Kafka consumer worker
- `services/frontend-a` — Admin SPA (users + audit log viewer; proxies `/api` to Service-A in Docker)
- `services/frontend-b` — Log panel component library + Storybook image
- `services/frontend-c` — User panel component library + Storybook image
- `services/common/protos` — shared `.proto` files

See **Local URLs and ports** for default host bindings and `.env` overrides.

See each service’s `dependencies.md` for dependency notes.
