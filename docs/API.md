# API reference

This document describes the **REST gateway** (Service-A), the **gRPC APIs** (Service-B: `AuthService`, `UserService`, `RoleService`), and **Kafka** events. Canonical protobuf contracts live under [`services/common/protos`](../services/common/protos) (`user/v1`, `auth/v1`, `role/v1`).

**Validation:** RPC payloads are validated in Service-B handlers (required fields, formats). Buf `protovalidate` annotations were not used in-repo because registry-backed validate modules were unavailable in this environment; rules are enforced in Go code instead.

---

## Authentication (JWT)

- Service-B issues **HS256** JWT **access** tokens and opaque **refresh** tokens (stored server-side). Configure **`JWT_SECRET`** (required in production).
- Send `Authorization: Bearer <access_token>` on protected Service-A routes; the gateway forwards the header as gRPC metadata.
- **Roles:** Users have named roles (e.g. `user`, `admin`). The `admin` role is required for most user/role management RPCs.
- **Bootstrap admin (Docker):** set **`BOOTSTRAP_ADMIN_USERNAME`** and **`BOOTSTRAP_ADMIN_PASSWORD`** so the first admin can sign in (see `.env.example`).

### Password reset (tutorial / dev)

- `POST /auth/forgot-password` always responds with a generic success message when the email is syntactically valid.
- When **`PASSWORD_RESET_DEV_RETURN_TOKEN=1`**, Service-B may include `resetToken` in the JSON body so local tests and tutorials can complete reset without SMTP. **Do not enable in production.**

---

## Service-A — HTTP (REST gateway)

Service-A listens on `PORT` (default **3000**). In Docker, **frontend-a** proxies `/api/*` to Service-A with the `/api` prefix stripped (`services/frontend-a/nginx/default.conf`).

Unless noted, JSON uses `Content-Type: application/json`. Errors use `{ "error": "<message>" }` where applicable.

### Error mapping (typical)

| HTTP | Source |
|------|--------|
| `400` | Invalid body / gRPC `INVALID_ARGUMENT` |
| `401` | gRPC `UNAUTHENTICATED` (missing/invalid token) |
| `403` | gRPC `PERMISSION_DENIED` (insufficient role) |
| `404` | gRPC `NOT_FOUND` |
| `409` | gRPC `ALREADY_EXISTS` |
| `500` | MongoDB or internal gateway error (e.g. audit logs) |
| `502` | Other upstream gRPC failures |

### `GET /health`

**Response** `200`: `{ "status": "ok", "service": "service-a" }`

### `POST /auth/register`

Public registration with password.

**Body:** `{ "username", "email", "password" }`

**Response** `201`: `{ "user": { "id", "username", "email", "roles": [...] } }`

### `POST /auth/login`

**Body:** `{ "username", "password" }`

**Response** `200`:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaque>",
  "expiresInSeconds": 3600,
  "user": { "id": "...", "username": "...", "email": "...", "roles": ["..."] }
}
```

### `POST /auth/logout`

**Headers:** `Authorization: Bearer <access>` (optional but typical)

**Body:** `{ "refreshToken": "<opaque>" }`

**Response** `204`

### `GET /auth/me`

**Headers:** `Authorization: Bearer <access>`

**Response** `200`: `{ "user": { "id", "username", "email", "roles" } }`

### `POST /auth/forgot-password`

**Body:** `{ "email" }`

**Response** `200`: `{ "message": "..." }` and optionally `resetToken` when `PASSWORD_RESET_DEV_RETURN_TOKEN=1`.

### `POST /auth/reset-password`

**Body:** `{ "token", "newPassword" }`

**Response** `204`

### `GET /users`

**Headers:** Bearer required.

**Query (optional):**

| Param | Meaning |
|-------|---------|
| `q` | Substring match on **username** or **email** (case-insensitive, Service-B). |
| `role` | Only users assigned this **role name** (e.g. `admin`). |

**Response** `200`: JSON array of user objects (`id`, `username`, `email`, `roles`).

Successful list requests write an audit row whose `payload` includes `filters: { q, role }` (null when omitted).

### `POST /users`

Admin-style create (optional password).

**Headers:** Bearer required (admin).

**Body:** `{ "username", "email", "password?" }`

**Response** `201` — created user. On success, an audit row may be written for `POST /users`.

### `GET /users/:id`

**Headers:** Bearer required.

**Response** `200` — user object.

### `PATCH /users/:id`

**Headers:** Bearer required (admin).

**Body:** `{ "username?", "email?", "password?" }`

**Response** `200` — updated user.

### `DELETE /users/:id`

**Headers:** Bearer required (admin).

**Response** `200` — deleted user snapshot.

### `POST /users/:id/roles`

**Headers:** Bearer required (admin).

**Body:** `{ "roleId" }`

**Response** `204`

### `DELETE /users/:id/roles/:roleId`

**Headers:** Bearer required (admin).

**Response** `204`

### `GET /roles`

**Headers:** Bearer required.

**Query (optional):** `q` — substring match on role **name** (case-insensitive).

**Response** `200`: `[{ "id", "name" }, ...]`

Audit payload includes `filters: { q }` when applicable.

### `POST /roles`

**Headers:** Bearer required (admin).

**Body:** `{ "name" }`

**Response** `201`: `{ "id", "name" }`

### `GET /roles/:id`

**Headers:** Bearer required.

**Response** `200`: `{ "id", "name" }`

### `PATCH /roles/:id`

**Headers:** Bearer required (admin).

**Body:** `{ "name" }`

**Response** `200`: `{ "id", "name" }`

### `DELETE /roles/:id`

**Headers:** Bearer required (admin).

**Response** `200`: `{ "id", "name" }`

### Audit logs (MongoDB)

On **successful** responses, Service-A may append a document to the audit collection. Payloads use a `kind` / `action` shape and **never** include passwords, refresh tokens, or reset tokens.

| Area | Routes that write audit rows (success only) |
|------|---------------------------------------------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Users | `GET /users`, `GET /users/:id`, `POST /users`, `PATCH /users/:id`, `DELETE /users/:id` |
| User roles | `POST /users/:id/roles`, `DELETE /users/:id/roles/:roleId` |
| Roles | `GET /roles`, `POST /roles`, `GET /roles/:id`, `PATCH /roles/:id`, `DELETE /roles/:id` |

`POST /users` also sets `createdUserId` on the audit row when a user id is returned, and includes `userId` in the `payload` for the same id.

**Troubleshooting:** Audit rows require **MongoDB** (`MONGO_URI` for Service-A). If Mongo is unreachable, the HTTP handler still returns success for the main operation; a failed audit write is logged server-side (`audit log write failed`).

Use **one** Service-A process and **one** MongoDB so the Admin **Logs** page reflects the same database your browser hits via the gateway. By default the API returns up to the **100** newest entries by `createdAt` (see `limit` below).

### `GET /audit-logs`

**Headers:** `Authorization: Bearer <access_token>` required.

**Response:** `401` if the header is missing, `403` if the token is valid but the user is not an **admin** (Service-A checks via `AuthService/Me`).

**Query (optional):**

| Param | Meaning |
|-------|---------|
| `path` | Substring match on request path (case-insensitive regex). |
| `method` | HTTP method match (case-insensitive, exact). |
| `q` | Substring match across path, method, `createdUserId`, or JSON-serialized `payload`. |
| `limit` | Max rows to return after filtering (default **100**, maximum **500**). |

Returns recent audit rows (newest first).

### CORS

Controlled by `CORS_ORIGIN` (default permissive). See `services/service-a/src/index.ts`.

---

## Service-B — gRPC

Service-B exposes **gRPC only** (no REST). Default listen address: `GRPC_LISTEN_ADDR` (default **`:50051`**).

Packages (under `services/common/protos`):

| Package | Service | Purpose |
|---------|---------|---------|
| `auth.v1` | `AuthService` | Register, login, logout, me, forgot/reset password |
| `user.v1` | `UserService` | User CRUD + list |
| `role.v1` | `RoleService` | Role CRUD; assign/remove role on user |

Unary calls use **metadata** `authorization: Bearer <access>` for protected RPCs (except public auth endpoints). Status codes follow the usual mapping (`Unauthenticated`, `PermissionDenied`, etc.).

---

## Kafka (Service-B producer)

Service-B publishes **JSON domain events** when `KAFKA_BROKERS` is set, to **two topics**:

- **`KAFKA_USER_EVENTS_TOPIC`** — default **`user.events`**. All user-aggregate messages (`event` = `user`), including auth and `user.role_*`.
- **`KAFKA_ROLE_EVENTS_TOPIC`** — default **`role.events`**. Role aggregate messages (`event` = `role`).

Each message has aggregate **`event`** (`user` or `role`), action **`data`** (for example `user.created`, `user.updated`, `user.deleted`, `user.login`, `user.logout`, `user.password_reset_requested`, `user.password_reset_completed`, `user.role_assigned`, `user.role_removed`, `role.created`, `role.updated`, `role.deleted`), RFC3339 **`timestamp`**, and type-specific fields (for example `user_id`, `username`, `email`, `source` on create where `source` is `registration` or `admin`). **Read-only** RPCs do not emit Kafka events.

**Operations:** Publishes use a short internal timeout and **do not** use the gRPC request context for the broker write, so user update/delete/role changes still emit after the database commit even if the client disconnects early.

**Docker:** `kafka-init` creates both topics. Check **service-b** logs for `Kafka producer enabled: user_topic=... role_topic=...` and open those topics in Kafka UI.

**Consumers:** **Service-C** uses `aiokafka`. By default it **discovers all non-internal topics** at startup (`KAFKA_DISCOVER_ALL_TOPICS=1`) and subscribes by name so `user.events`, `role.events`, and any other app topics are all consumed. If discovery is off (`KAFKA_DISCOVER_ALL_TOPICS=0`), it uses `KAFKA_TOPIC_PATTERN` (normalized empty/`*`/`all` → `.*`). It logs records and **does not expose HTTP** or implement login/register APIs.

**Kafka UI:** started by `docker-compose.infra.yml` (default [http://localhost:8080](http://localhost:8080)).

---

## Admin frontend (frontend-a)

| Path | Purpose |
|------|---------|
| `/login` | Sign in; stores tokens in `localStorage` |
| `/` | Dashboard (requires auth) |
| `/users` | Admin: create + directory (list/edit/delete). Non-admin: message + user lookup by id |
| `/roles` | Admin: role CRUD. Non-admin: short notice |
| `/logs` | Audit log table |
| `/kafka` | Link to Kafka UI + domain event reference |

Storybook: **frontend-b** (log panel), **frontend-c** (user panel + auth/RBAC presentational components).
