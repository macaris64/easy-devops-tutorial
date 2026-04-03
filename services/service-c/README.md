# Service-C (Kafka consumer)

Service-C is a **Kafka consumer only**. It subscribes using `aiokafka`, logs messages, and **does not expose HTTP**.

Authentication, login, and RBAC live in **Service-B** (gRPC) and **Service-A** (REST gateway). Use those services for JWT issuance and user management APIs—not Service-C.
