# Ansible (local Docker)

Deploys the monorepo stack with [`community.docker.docker_compose_v2`](https://docs.ansible.com/ansible/latest/collections/community/docker/docker_compose_v2_module.html), applies **Kafka topics** from the Puppet-generated catalog, and runs a minimal **HTTP health** check.

## Prerequisites

- Ansible 2.14+ (ansible-core) and Docker CLI on the control node (your laptop).
- Collections: `ansible-galaxy collection install -r requirements.yml` from this directory.

## Layout

| Playbook | Purpose |
|----------|---------|
| `playbooks/deploy.yml` | `docker compose up` (IaC overlay on by default) |
| `playbooks/kafka_topics.yml` | `docker run … kafka-topics.sh --create --if-not-exists` for each catalog entry |
| `playbooks/verify.yml` | `GET /health` on service-a |
| `playbooks/site.yml` | Imports the three playbooks in order |

## IaC path (Terraform overlay)

1. `terraform -chdir=../terraform apply` (writes `../generated/terraform.env.fragment`)
2. Merge that fragment into `.env` after [`.env.example`](../../.env.example); see [`../terraform/README.md`](../terraform/README.md)
3. Render Puppet outputs: see [`../puppet/README.md`](../puppet/README.md), then append `../generated/compose.env.fragment` to `.env`
4. From `infrastructure/ansible`:

```bash
ansible-galaxy collection install -r requirements.yml
ansible-playbook playbooks/site.yml
```

Use a project `.env` (copy from [`.env.example`](../../.env.example)), append `infrastructure/generated/terraform.env.fragment` after Terraform apply, then `infrastructure/generated/compose.env.fragment` after Puppet so secrets and volume/topic names match the IaC outputs.

## Quickstart path (no Terraform)

Do **not** run Terraform. Use Compose only:

```bash
ansible-playbook playbooks/deploy.yml -e iac_compose_overlay=false
ansible-playbook playbooks/kafka_topics.yml
ansible-playbook playbooks/verify.yml
```

`kafka_topics.yml` still needs `app-network` from Compose and [`../generated/kafka-topics.yaml`](../generated/kafka-topics.yaml). Run Puppet once to create the catalog, or copy a hand-written `kafka-topics.yaml` into `infrastructure/generated/`.

## Tags

- `deploy`, `compose` — deploy playbook
- `kafka`, `topics` — Kafka catalog play
- `verify`, `smoke` — health check

## Variables

| Variable | Default | Meaning |
|----------|---------|---------|
| `iac_compose_overlay` | `true` | Use `docker-compose.iac.yml` with Terraform-managed network/volumes |
| `SERVICE_A_HTTP_PORT` | `3000` | Read from environment for `verify.yml` |
