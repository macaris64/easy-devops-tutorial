# Puppet (containerized apply)

Declares **desired Kafka topics**, **volume names**, and related defaults in Hiera and renders files under [`../generated/`](../generated/) for Ansible and operators.

## Prerequisites

- Docker only (no Puppet installed on the host).

## Render generated files

From the **repository root**:

```bash
docker run --rm --entrypoint /bin/bash \
  -v "$(pwd):/workspace" \
  -w /workspace/infrastructure/puppet \
  puppet/puppet-agent:latest \
  -lc '/opt/puppetlabs/puppet/bin/puppet apply --modulepath=modules \
    --hiera_config=/workspace/infrastructure/puppet/hiera.yaml \
    /workspace/infrastructure/puppet/manifests/site.pp'
```

This creates (gitignored except the folder stub):

- `infrastructure/generated/kafka-topics.yaml` — topic catalog for [`../ansible/playbooks/kafka_topics.yml`](../ansible/playbooks/kafka_topics.yml)
- `infrastructure/generated/compose.env.fragment` — optional lines to append to `.env` (volume names + `KAFKA_*` topic names)

## Customizing

Edit [`data/common.yaml`](data/common.yaml): `easy_devops::kafka_topics`, `easy_devops::kafka_user_events_topic`, `easy_devops::kafka_role_events_topic`, and volume name keys. Keep topic names aligned with **service-b** publishers and **service-c** consumers ([`.env.example`](../../.env.example), [docs/API.md](../../docs/API.md)).

## Layout

| Path | Role |
|------|------|
| `hiera.yaml` | Hiera 5 hierarchy |
| `data/common.yaml` | Tutorial defaults |
| `modules/easy_devops/` | Class, templates (`.epp`) |
| `manifests/site.pp` | `include easy_devops` |
