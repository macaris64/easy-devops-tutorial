# Terraform (local Docker)

Provisions the **Docker network** and **named volumes** consumed when you run Compose with the IaC overlay [`docker-compose.iac.yml`](../../docker-compose.iac.yml). It also writes a **gitignored** Compose env fragment with selected **secrets** under `infrastructure/generated/terraform.env.fragment` (merge into `.env` on the IaC path; see [`../../docs/INFRASTRUCTURE.md`](../../docs/INFRASTRUCTURE.md)).

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) 1.5+ **or** run CLI via Docker, for example:  
  `docker run --rm -v "$(pwd):/workspace" -v /var/run/docker.sock:/var/run/docker.sock -w /workspace hashicorp/terraform:1.9 <command>`
- Docker Engine with a reachable socket (default `unix:///var/run/docker.sock`). When using the container, mount the socket as above.

## Important

- **Quickstart (no Terraform):** use `docker compose up` only. Do **not** run `terraform apply` first, or creating `app-network` in Compose will fail (name already taken).
- **IaC path:** run `terraform apply` here **before** `docker compose` with the overlay file. See [`../README.md`](../README.md).

## Commands

```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

Destroying frees the network and volumes (**PostgreSQL and MongoDB data are removed** if nothing else holds the volumes) and removes the generated secrets fragment resource (re-apply recreates it):

```bash
terraform destroy
```

## Secrets and state

- Secret values are **sensitive** Terraform variables. Set them with a **gitignored** `terraform.tfvars` or with `TF_VAR_jwt_secret` (and similar) in your environment. See [`terraform.tfvars.example`](terraform.tfvars.example).
- Defaults match [`.env.example`](../../.env.example) so a local `terraform apply` works without a tfvars file; use overrides for anything non-demo.
- Those values are stored in **Terraform state** (`terraform.tfstate` by default). Do **not** commit state; treat it as confidential. For teams, use a **remote backend** with encryption and locking.

## Variables

| Name | Default | Description |
|------|---------|-------------|
| `postgres_volume_name` | `easy_devops_postgres_data` | Must match `.env` / compose overlay |
| `mongodb_volume_name` | `easy_devops_mongodb_data` | Must match `.env` / compose overlay |
| `postgres_password` | `postgres` | Maps to `POSTGRES_PASSWORD` in the generated fragment (sensitive) |
| `jwt_secret` | `change-me-in-production` | Maps to `JWT_SECRET` (sensitive) |
| `bootstrap_admin_password` | `admin123` | Maps to `BOOTSTRAP_ADMIN_PASSWORD` (sensitive) |
| `seed_demo_password` | `demo123` | Maps to `SEED_DEMO_PASSWORD` (sensitive) |

Override volumes with `-var` or tfvars as usual. Override secrets with tfvars or `TF_VAR_*` (do not commit real secrets).
