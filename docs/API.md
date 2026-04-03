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

**Response** `200`: JSON array of user objects (`id`, `username`, `email`, `roles`).

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

**Response** `200`: `[{ "id", "name" }, ...]`

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

### `GET /audit-logs`

**Headers:** Bearer recommended if the gateway is locked down.

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

When a user is created (legacy path / relevant RPCs), Service-B may publish JSON to `USER_CREATED_TOPIC` (default **`user.created`**).

**Consumers:** **Service-C** uses `aiokafka` with `KAFKA_TOPIC_PATTERN` (default `.*`). It logs records and **does not expose HTTP** or implement login/register APIs.

**Kafka UI:** started by `docker-compose.infra.yml` (default [http://localhost:8080](http://localhost:8080)).

---

## Admin frontend (frontend-a)

| Path | Purpose |
|------|---------|
| `/login` | Sign in; stores tokens in `localStorage` |
| `/` | Dashboard (requires auth) |
| `/users` | Admin: create + directory (list/edit/delete). Non-admin: message + user lookup by id |
| `/logs` | Audit log table |
| `/kafka` | Link to Kafka UI |

Storybook: **frontend-b** (log panel), **frontend-c** (user panel + auth/RBAC presentational components).
