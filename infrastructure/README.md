# Infrastructure (Terraform, Puppet, Ansible)

This folder adds a **local Docker IaC path** alongside the existing **quickstart** (`docker compose up` only). The application graph stays in [`docker-compose.yml`](../docker-compose.yml) and [`docker-compose.infra.yml`](../docker-compose.infra.yml); Terraform owns **network + volumes**, Puppet owns **policy data and generated config**, Ansible owns **deployment, Kafka topics, and smoke checks**.

## Roles

| Tool | What it does |
|------|----------------|
| **Terraform** | Creates Docker **network** `app-network` and **named volumes** for Postgres and MongoDB. |
| **Puppet** | Renders `infrastructure/generated/kafka-topics.yaml` and `compose.env.fragment` from Hiera (run via Docker). |
| **Ansible** | `docker compose` up (with or without IaC overlay), **Kafka topic** ensure from the catalog, **`GET /health`**. |

**Compose-only quickstart** still runs `kafka-init` to create default topics. The Ansible topic play is **idempotent** (`--if-not-exists`) and reinforces the same catalog when you use the IaC workflow.

## IaC workflow (order matters)

1. **Terraform** — from [`terraform/`](terraform/README.md): `terraform init && terraform apply`  
   Do **not** run this if you plan to use plain `docker compose up` without the overlay on the same machine (network name collision). Destroy Terraform resources or use only one path.

2. **Puppet** — see [`puppet/README.md`](puppet/README.md) (Docker one-liner).

3. **Environment** — copy [`.env.example`](../.env.example) to `.env`. Optionally append `infrastructure/generated/compose.env.fragment`.

4. **Ansible** — see [`ansible/README.md`](ansible/README.md): `ansible-galaxy collection install -r requirements.yml` then `ansible-playbook playbooks/site.yml`.

Compose files for this path:

```bash
docker compose -f docker-compose.yml -f docker-compose.iac.yml up --build -d
```

(or let Ansible run the same `files` list.)

## Quickstart (no Terraform)

```bash
docker compose up --build -d
```

Use Ansible without the overlay:

```bash
ansible-playbook playbooks/deploy.yml -e iac_compose_overlay=false
```

You still need `infrastructure/generated/kafka-topics.yaml` for `kafka_topics.yml` (run Puppet once, or create the file by hand).

## Makefile (repo root)

From the repository root, `make help` lists targets. Common flows:

| Target | Purpose |
|--------|---------|
| `make run-up` / `make run-down` | Quickstart Compose (no Terraform) |
| `make infra-terraform-*` | Init, fmt, validate, plan, apply, destroy |
| `make infra-puppet-apply` | Render `infrastructure/generated/*` |
| `make infra-ansible-install` then `make infra-ansible-site` | Full IaC deploy + topics + health |
| `make infra-full-iac` | Terraform apply → Puppet → merge env fragment → Ansible site |

Terraform runs via the `terraform` binary when installed; otherwise the Makefile uses the official `hashicorp/terraform:1.9` image (Docker socket required).

## GitHub Actions (simulation)

Workflows run the same Terraform → Puppet → Ansible sequence on **`ubuntu-latest`**, using the runner’s Docker engine. There is **no cloud provider**; stacks are **destroyed at the end** so the job stays idempotent.

| Workflow | When | GitHub Environments |
|----------|------|----------------------|
| [`.github/workflows/infrastructure-pull-request.yml`](../.github/workflows/infrastructure-pull-request.yml) | PR opened/updated | `simulated-development` (same-repo PRs only; fork PRs skip the registration job because GitHub Environments are not applied to those workflows) |
| [`.github/workflows/infrastructure-main.yml`](../.github/workflows/infrastructure-main.yml) | Push to `main` or `master` | `simulated-master` |

Both call [`.github/workflows/infrastructure-simulate-deploy.yml`](../.github/workflows/infrastructure-simulate-deploy.yml) for Terraform, Puppet, and Ansible on the runner Docker daemon, then tear down. Path filters limit runs to infrastructure-related changes; adjust the `paths:` lists if you want every merge to simulate.

Create optional **protection rules** under Repository → Settings → Environments for `simulated-development` and `simulated-master` (defaults: none).

## Further reading

- [terraform/README.md](terraform/README.md)
- [puppet/README.md](puppet/README.md)
- [ansible/README.md](ansible/README.md)
