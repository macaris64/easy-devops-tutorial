# Infrastructure and operations

This guide ties together **local Docker**, **IaC** (Terraform, Puppet, Ansible), **Makefile** shortcuts, **CI simulation**, and a practical **manual E2E** checklist. For service ports and env vars, see the [root README](../README.md). For system design, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Quick reference

| Topic | Location |
|-------|----------|
| Compose stack | [`docker-compose.yml`](../docker-compose.yml), [`docker-compose.infra.yml`](../docker-compose.infra.yml) |
| IaC overlay (Terraform volumes/network) | [`docker-compose.iac.yml`](../docker-compose.iac.yml) |
| Makefile targets | [`Makefile`](../Makefile) — run `make help` |
| Terraform / Puppet / Ansible detail | [`infrastructure/README.md`](../infrastructure/README.md) |
| Simulated deploys on GitHub Actions | [`.github/workflows/infrastructure-pull-request.yml`](../.github/workflows/infrastructure-pull-request.yml), [`.github/workflows/infrastructure-main.yml`](../.github/workflows/infrastructure-main.yml) |

---

## Run the stack (project commands)

**Quickstart (no Terraform):**

```bash
make run-up
# or: docker compose up --build -d
```

**Stop:**

```bash
make run-down
```

**Logs and status:**

```bash
make run-logs
make run-ps
```

Default URLs (see README for env overrides): Service-A [http://localhost:3000](http://localhost:3000), admin SPA [http://localhost:4173](http://localhost:4173), Kafka UI [http://localhost:8080](http://localhost:8080).

---

## Infrastructure commands (IaC)

From the repo root:

| Step | Command |
|------|---------|
| Puppet catalog + env fragment | `make infra-puppet-apply` |
| Puppet parser check | `make infra-puppet-validate` |
| Terraform (uses `terraform` on PATH, else Docker image) | `make infra-terraform-init`, `infra-terraform-plan`, `infra-terraform-apply`, `infra-terraform-destroy` |
| Ansible collections | `make infra-ansible-install` |
| Full IaC deploy + topics + health | `make infra-full-iac` (requires Docker; creates/uses `.env`) |

**Order for IaC:** `terraform apply` → append `infrastructure/generated/terraform.env.fragment` into `.env` (secrets; idempotent via marker comment) → Puppet apply → append `infrastructure/generated/compose.env.fragment` → Ansible `site` (or `make infra-full-iac`, which performs those steps). Secret values also live in **Terraform state**; keep state off Git and treat it as sensitive (see [`infrastructure/terraform/README.md`](../infrastructure/terraform/README.md)). Do **not** run Terraform on the same host where you already use plain `docker compose up` without the overlay unless you resolve the `app-network` name conflict.

---

## Manual E2E checklist

With the stack up:

1. **REST**
   - `curl -s http://127.0.0.1:3000/health`
   - `curl -s -X POST http://127.0.0.1:3000/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}'`
   - Use the returned `accessToken` for `Authorization: Bearer …` on admin routes (e.g. `GET /users`).

2. **gRPC (service-b)**  
   Service-B does **not** expose gRPC reflection. Use **grpcurl** with repo protos on the Docker network, for example:

   ```bash
   ACCESS="<paste JWT from login>"
   docker run --rm --network app-network -v "$(pwd)/services/common/protos:/protos" golang:1.22-bookworm bash -c '
     go install github.com/fullstorydev/grpcurl/cmd/grpcurl@v1.9.1
     /go/bin/grpcurl -plaintext -import-path /protos -proto user/v1/user.proto \
       -H "authorization: Bearer '"$ACCESS"'" -d "{}" \
       service-b:50051 user.v1.UserService/ListUsers
   '
   ```

3. **Kafka**
   - Topics: `docker exec kafka /opt/bitnami/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list`
   - Sample consume:  
     `docker exec kafka /opt/bitnami/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic user.events --from-beginning --max-messages 1 --timeout-ms 10000`
   - UI: [http://localhost:8080](http://localhost:8080)

4. **Databases**
   - Postgres: `docker exec postgres psql -U postgres -d users -c 'SELECT count(*) FROM users;'`
   - MongoDB (audit): `docker exec mongodb mongosh --quiet service_a --eval 'db.auditlogs.countDocuments({})'`

5. **Application logs**
   - `docker compose logs --tail 50 service-a service-b service-c`

---

## Lint, test, build, coverage (local / CI parity)

**Contracts (Buf)** — from host with Docker:

```bash
docker run --rm --entrypoint /bin/sh -v "$(pwd)/services/common:/workspace" -w /workspace bufbuild/buf:latest -c \
  'buf lint && buf build && buf format -d --exit-code protos'
```

**Service-A (Node)** — Jest needs protos on disk; mount `services/common/protos` and set `USER_PROTO_ROOT` (matches CI expectations):

```bash
docker run --rm \
  -v "$(pwd)/services/service-a:/app" \
  -v "$(pwd)/services/common/protos:/common/protos" \
  -e USER_PROTO_ROOT=/common/protos \
  -w /app node:20-bookworm bash -c \
  'npm ci && npm run lint && npm run lint:style && npm run build && npm run test:coverage'
```

**Service-B (Go)** — example with containers:

```bash
docker run --rm -v "$(pwd)/services/service-b:/app" -w /app golangci/golangci-lint:v1.59.1 golangci-lint run ./... --timeout=5m
docker run --rm -v "$(pwd)/services/service-b:/app" -w /app golang:1.22-bookworm bash -c 'go build -o /tmp/sb . && bash scripts/check-coverage.sh'
```

**Service-C (Python):**

```bash
docker run --rm -v "$(pwd)/services/service-c:/app" -w /app python:3.11-slim bash -c \
  'pip install -q ".[dev]" && ruff check src tests && ruff format --check src tests && pytest --cov=src --cov-report=term-missing'
```

**Frontends** — build **frontend-b** and **frontend-c** before **frontend-a** (file dependencies); see [root README](../README.md) and [`.github/workflows/frontends.yml`](../.github/workflows/frontends.yml).

---

## GitHub Actions (simulation)

- **Pull requests:** `infrastructure-pull-request.yml` runs Terraform, Puppet, and Ansible against the runner’s Docker, then tears down. A follow-up job registers the **`simulated-development`** environment for **same-repo** PRs only (fork PRs skip environment registration).
- **Main / master:** `infrastructure-main.yml` does the same for **`simulated-master`**.

No cloud provider is used; this is an **integration smoke** of the IaC path.

### Docker Hub rate limits on GitHub-hosted runners

Anonymous pulls share IP quotas; `docker compose up` pulls many images at once (Kafka UI and application base images such as Node, Go, and Nginx), which can fail with `toomanyrequests: Rate exceeded`.

The workflow **pre-pulls images one at a time with retries** before Ansible runs. For extra headroom, add repository secrets **`DOCKERHUB_USERNAME`** and **`DOCKERHUB_TOKEN`** (a [Docker Hub access token](https://docs.docker.com/docker-hub/access-tokens/)); the workflow logs in to Docker Hub when both are set.

---

## Related documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — components and Compose topology  
- [API.md](API.md) — REST, gRPC, Kafka  
- [infrastructure/README.md](../infrastructure/README.md) — Terraform, Puppet, Ansible, Makefile, workflows  
