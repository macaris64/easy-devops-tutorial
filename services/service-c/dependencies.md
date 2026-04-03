# Service-C dependencies

| Package | Role |
|---------|------|
| `aiokafka` | Async Kafka consumer; topic regex from `KAFKA_TOPIC_PATTERN` (default `.*`) |

Dev / tooling (see `pyproject.toml` `[project.optional-dependencies] dev`): `pytest`, `pytest-asyncio`, `pytest-cov`, `ruff`.

Runtime image stays minimal (see `requirements.txt` for Docker).
