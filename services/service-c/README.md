# Service-C (Kafka consumer)

Service-C is a **Kafka consumer only**. It subscribes using `aiokafka`, logs messages, and **does not expose HTTP**.

By default (`KAFKA_DISCOVER_ALL_TOPICS=1`) it asks the broker for **all non-internal topic names** at startup and subscribes to that list, so every application topic that already exists (e.g. `user.events`, `role.events`) is consumed. **Restart Service-C** after adding new topics, or set `KAFKA_DISCOVER_ALL_TOPICS=0` and use regex `KAFKA_TOPIC_PATTERN` (e.g. `.*`) so the client can pick up matching topics as metadata refreshes. Empty / `*` / `all` in `KAFKA_TOPIC_PATTERN` are normalized to `.*`.

Authentication, login, and RBAC live in **Service-B** (gRPC) and **Service-A** (REST gateway). Use those services for JWT issuance and user management APIs—not Service-C.
