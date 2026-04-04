# Service-C dependencies

| Package | Role |
|---------|------|
| `aiokafka` | Async consumer; default **topic discovery** (`KAFKA_DISCOVER_ALL_TOPICS`) lists all public topics, or regex via `KAFKA_TOPIC_PATTERN` |

Dev / tooling (see `pyproject.toml` `[project.optional-dependencies] dev`): `pytest`, `pytest-asyncio`, `pytest-cov`, `ruff`.

Runtime image stays minimal (see `requirements.txt` for Docker).
