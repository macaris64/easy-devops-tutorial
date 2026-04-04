# Terraform (local Docker)

Provisions the **Docker network** and **named volumes** consumed when you run Compose with the IaC overlay [`docker-compose.iac.yml`](../../docker-compose.iac.yml).

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

Destroying frees the network and volumes (**PostgreSQL and MongoDB data are removed** if nothing else holds the volumes):

```bash
terraform destroy
```

## Variables

| Name | Default | Description |
|------|---------|-------------|
| `postgres_volume_name` | `easy_devops_postgres_data` | Must match `.env` / compose overlay |
| `mongodb_volume_name` | `easy_devops_mongodb_data` | Must match `.env` / compose overlay |

Override with `-var` or a `terraform.tfvars` file (do not commit secrets).
