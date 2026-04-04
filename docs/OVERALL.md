🏗️ Polyglot Microservices Monorepo Blueprint

This document defines the architectural standards, communication protocols, and infrastructure layout for the easy-devops-tutorial project.

📂 Repository Structure

/easy-devops-tutorial
├── /services
│   ├── /service-a           # Node.js (Gateway / REST to gRPC)
│   ├── /service-b           # Go (Auth & Core / gRPC Server)
│   ├── /service-c           # Python (Event Consumer / Worker)
│   └── /common              # Shared Protocol Buffers (.proto) & Configs
├── /infrastructure
│   ├── /terraform           # Local Docker network + volumes (Terraform Docker provider)
│   ├── /ansible             # Compose deploy, Kafka topics, smoke checks
│   └── /puppet              # Hiera + generated config (containerized apply)
├── docker-compose.yml       # Application Services Orchestration
└── docker-compose.infra.yml # Shared Backing Services (Kafka, DBs, etc.)


🚦 Service Catalog & Responsibility Matrix

1. Service-A: The Edge Gateway

Runtime: Node.js 20 (TypeScript)

Role: Entry point for external traffic. Handles Protocol Translation.

Tasks: - Expose REST API (Port 3000).

Convert REST requests to gRPC calls for Service-B.

Produce "Audit" events to Kafka topic service-a-events.

Storage: MongoDB (Request logging & metadata).

Key Deps: express, @grpc/grpc-js, kafkajs, mongoose.

2. Service-B: Identity & Auth System

Runtime: Go 1.22

Role: Centralized business logic and security authority.

Tasks:

Serve gRPC requests (Port 50051).

Manage User/Auth state in PostgreSQL.

Emit "Domain Events" (e.g., user.created) to Kafka topic auth-events.

Storage: PostgreSQL (Relational user data).

Key Deps: grpc-go, gorm, segmentio/kafka-go.

3. Service-C: Event Processor

Runtime: Python 3.11

Role: Asynchronous worker for side-effects and data processing.

Tasks:

Consume events from all Kafka topics.

Process business logic (e.g., mock email sending, reporting).

Storage: None (Stateless) or Local Cache.

Key Deps: aiokafka, pydantic.

🔌 Communication Strategy

Type

Path

Protocol

Logic

External

Client -> Service-A

REST/JSON

Standard HTTP calls.

Internal (Sync)

Service-A -> Service-B

gRPC

High-performance binary RPC using Protobuf.

Internal (Async)

Service-A/B -> Kafka

Pub/Sub

Decoupled event-driven architecture.

Internal (Events)

Kafka -> Service-C

Consumer

Background processing.

🛠️ Infrastructure (The "Local Cloud" Simulation)

Backing Services (docker-compose.infra.yml)

Message Broker: Kafka (Bitnami) + Zookeeper.

Databases: MongoDB (for A) & PostgreSQL (for B).

Observability: Kafka-UI (Port 8080) for monitoring message flow.

Network Configuration

Network Name: app-network (Docker Bridge).

Service Discovery: Services resolve each other by container name (e.g., service-b:50051).

🚀 DevOps Roadmap (Simulation Strategy)

Phase 1 (Local Docker): Get all services running via docker-compose.

Phase 2 (IaC - Terraform): Use Terraform to provision local Sanal Makineler (VMs) instead of raw Docker.

Phase 3 (Config - Ansible): Automate Docker installation and Service deployment on the VMs.

Phase 4 (Policy - Puppet): Ensure OS-level security and consistency across the "Local Cloud".

📋 Development Standards

Contract First: All gRPC changes must start in services/common/protos/.

Multi-stage Builds: All Dockerfiles must use multi-stage builds to minimize image size.

Environment Driven: No hardcoded URLs. Use .env files for all service addresses.