# easy-devops-tutorial

Polyglot microservices monorepo: **Service-A** (Node.js / Express + MongoDB), **Service-B** (Go / gRPC + PostgreSQL + Kafka), **Service-C** (Python / aiokafka). Shared contracts live in `services/common/protos` (`user`, `auth`, `role`).

**API documentation:** [docs/API.md](docs/API.md) (REST gateway, JWT/RBAC, gRPC services, Kafka). **Operations / IaC:** [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md).

## Local URLs and ports

After `docker compose up`, services publish to **localhost** unless you change the mapped ports in `.env` (variable names in parentheses).

**Examples:** [http://localhost:3000](http://localhost:3000), [http://localhost:4173](http://localhost:4173), [http://localhost:6006](http://localhost:6006), [http://localhost:6007](http://localhost:6007), [http://localhost:8080](http://localhost:8080), etc. (defaults; full mapping below).

### Application services

| Application | Address | Notes |
|-------------|---------|--------|
| **Service-A** (REST API) | [http://localhost:3000](http://localhost:3000) | HTTP; `SERVICE_A_HTTP_PORT` |
| **Service-B** (gRPC) | `localhost:50051` | gRPC only; `SERVICE_B_GRPC_PORT` |
| **Service-C** (Kafka consumer) | — | No host port; runs on `app-network` only; **no HTTP / auth APIs** ([services/service-c/README.md](services/service-c/README.md)) |
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
- Optional **IaC path**: Terraform, Ansible (with `community.docker`), and Puppet via Docker—see [infrastructure/README.md](infrastructure/README.md). Run `make help` from the repo root for shortcuts.

## Infrastructure as Code (optional)

Terraform provisions the Docker **network** and **named data volumes** used with [`docker-compose.iac.yml`](docker-compose.iac.yml). Puppet (containerized `puppet apply`) renders `infrastructure/generated/kafka-topics.yaml` and an optional `compose.env.fragment`. Ansible runs `docker compose`, applies **Kafka topics** from that catalog (`--if-not-exists`, same defaults as `kafka-init`), and checks `GET /health`.

**Order:** `terraform apply` → Puppet render → copy/merge `.env` → `ansible-playbook infrastructure/ansible/playbooks/site.yml`. Do **not** run Terraform on the same host if you rely on plain `docker compose up` without the overlay (both create `app-network`). Details: [infrastructure/README.md](infrastructure/README.md).

## Quick start

1. Optional environment file:

   ```bash
   cp .env.example .env
   ```

2. Start infrastructure and all application services:

   ```bash
   docker compose up --build -d
   ```

   `docker-compose.yml` includes `docker-compose.infra.yml`. All containers attach to the **`app-network`** bridge network. Postgres and MongoDB use **named volumes** (`postgres_data`, `mongodb_data`) so data survives container recreation (`docker compose down` without `-v` keeps volumes).

3. Smoke-test the HTTP API and auth:

   ```bash
   curl -s http://localhost:3000/health
   curl -s -X POST http://localhost:3000/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"admin123"}'
   ```

   On each **service-b** start, seeders ensure default accounts exist (idempotent — existing rows are left unchanged): **admin** (`BOOTSTRAP_ADMIN_*`, defaults `admin` / `admin123`) and **demo** (`SEED_DEMO_*`, defaults `demo` / `demo123`, non-admin). Open [http://localhost:4173](http://localhost:4173), sign in at [http://localhost:4173/login](http://localhost:4173/login), then use **Users** (admin only) or **Look up user** by id. Disable the demo user by setting `SEED_DEMO_USERNAME=` (empty) in `.env`.

   **Troubleshooting (admin UI):** The shell stores JWTs in **browser localStorage** for `http://localhost:4173`. If `/` never shows a sign-in flow and [http://localhost:4173/login](http://localhost:4173/login) says you are already signed in (or you get sent straight to `/`), you still have a valid session—use **Continue to app** or **Sign out** on that page. To force a fresh login, clear site data for `localhost:4173` (DevTools → Application → Local Storage) or remove keys `easy_devops_access_token` and `easy_devops_refresh_token`. There is no public **register** page; use the seeded admin or create users via **Users** (admin) or the API.

   **Login returns `UNAUTHENTICATED` / invalid credentials:** Default admin is **`admin` / `admin123`** (and demo **`demo` / `demo123`**). Keep `.env.example` passwords in sync with that, or your first `docker compose up` may have created `admin` with `admin123` while a later `.env` suggests a different password—the seeder does **not** update existing users. Use the password that was active on first create, or run `docker compose down -v` and bring the stack up again (this deletes Postgres data).

4. **Kafka UI**: [http://localhost:8080](http://localhost:8080) — inspect **`user.events`** and **`role.events`** (defaults; override with `KAFKA_USER_EVENTS_TOPIC` / `KAFKA_ROLE_EVENTS_TOPIC`).

5. **Kafka topics**: `kafka-init` in `docker-compose.infra.yml` creates both topics above. Service-B and Service-C start after it completes successfully. On the **Ansible IaC** path, the same topics are ensured again from the Puppet-generated catalog (idempotent). See [infrastructure/README.md](infrastructure/README.md).

6. **Service-C** logs (by default it **discovers and subscribes to all** non-internal Kafka topics):

   ```bash
   docker compose logs -f service-c
   ```

7. **End-to-end checks**: `GET /health` and `POST /users` succeed; users are stored in PostgreSQL; MongoDB collection `auditlogs` stores audit rows for successful gateway calls (see [docs/API.md](docs/API.md)); Service-B publishes JSON domain events to **`user.events`** / **`role.events`**; Service-C logs consumed messages. After Kafka restarts you may briefly see `GroupCoordinatorNotAvailableError` in Service-C until the group coordinator is ready.

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

Jobs run **lint**, **build** (where applicable), **stylelint** (Service-A CSS only), **tests**, and coverage thresholds from each package (Service-A Jest: high line/statement coverage with a pragmatic branch floor; Service-B: aggregate script excludes generated protos/models; frontends **≥80%** in `frontends.yml`).

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
bash scripts/check-coverage.sh   # go test ./internal/... (aggregate min 60%, excludes genpb+model)
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
| `KAFKA_USER_EVENTS_TOPIC` / `KAFKA_ROLE_EVENTS_TOPIC` | Defaults `user.events` / `role.events` (Service-B producer + `kafka-init`) |
| `GRPC_HOST` / `GRPC_PORT` | Service-A → Service-B gRPC |
| `USER_PROTO_ROOT` | Service-A: directory with `user/`, `auth/`, `role/` proto trees (Docker: `/app/protos`) |
| `JWT_SECRET` | Service-B: HMAC key for access JWTs |
| `BOOTSTRAP_ADMIN_USERNAME` / `BOOTSTRAP_ADMIN_PASSWORD` | Service-B: ensure admin user on each start (skip if username exists) |
| `SEED_DEMO_USERNAME` / `SEED_DEMO_PASSWORD` / `SEED_DEMO_EMAIL` | Service-B: ensure non-admin demo user on each start (omit username or password to disable) |
| `PASSWORD_RESET_DEV_RETURN_TOKEN` | Service-B: `1` to return reset token in JSON (dev only) |

## Bitnami images

Kafka and Zookeeper use **`public.ecr.aws/bitnami/...`** because some environments cannot pull `docker.io/bitnami/*`. You may switch tags to `docker.io/bitnami/...` if preferred.

## Protobuf

Service-B’s Docker build runs **`buf generate`** from `services/common` into `internal/genpb`. Change contracts in `services/common/protos/` first, then regenerate stubs.

[Buf](https://buf.build) enforces lint, formatting, and builds in CI (`proto.yml`). Locally, install the Buf CLI and from `services/common` run `bash scripts/validate-protos.sh` (same checks as CI except breaking detection).

## Layout

- `services/service-a` — REST gateway
- `services/service-b` — gRPC + PostgreSQL + Kafka producer
- `services/service-c` — Kafka consumer worker
- `services/frontend-a` — Admin SPA (login, JWT session, admin-gated user management, user lookup, audit logs, Kafka UI link; proxies `/api` to Service-A in Docker)
- `services/frontend-b` — Log panel component library + Storybook image
- `services/frontend-c` — User panel component library + Storybook image
- `services/common/protos` — shared `.proto` files

See **Local URLs and ports** for default host bindings and `.env` overrides.

See each service’s `dependencies.md` for dependency notes.
