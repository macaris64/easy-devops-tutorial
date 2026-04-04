import cors from "cors";
import type { CorsOptions } from "cors";
import express, { Request, Response } from "express";
import * as grpc from "@grpc/grpc-js";
import type { GrpcBackend } from "./grpcBackend";
import { normalizeUserIdParam, pickQueryString } from "./paramUtils";

export interface AuditLogRow {
  id: string;
  path: string;
  method: string;
  createdAt: string;
  payload: Record<string, unknown>;
  createdUserId?: string;
}

/** Query parameters for listing audit rows (Mongo-backed). */
export interface AuditLogListQuery {
  path?: string;
  method?: string;
  /** Substring match across path, method, payload JSON, created user id. */
  q?: string;
  /** Max rows (default 100, max 500). */
  limit?: number;
}

export interface AppDeps {
  grpc: GrpcBackend;
  saveAuditLog: (entry: {
    path: string;
    method: string;
    payload: Record<string, unknown>;
    createdUserId?: string;
  }) => Promise<void>;
  listAuditLogs: (query?: AuditLogListQuery) => Promise<AuditLogRow[]>;
}

type AuditEntry = Parameters<AppDeps["saveAuditLog"]>[0];

/** Persists audit row; logs and swallows errors so upstream mutations still succeed. */
async function saveAuditBestEffort(
  deps: AppDeps,
  entry: AuditEntry,
): Promise<void> {
  try {
    await deps.saveAuditLog(entry);
  } catch (e) {
    console.error(
      "audit log write failed:",
      entry.method,
      entry.path,
      e,
    );
  }
}

function authHeader(req: Request): string | undefined {
  const h = req.headers.authorization;
  return typeof h === "string" && h.length > 0 ? h : undefined;
}

/** Field names present in a user PATCH body (never log password values). */
function userPatchFieldNames(body: Record<string, unknown>): string[] {
  const fields: string[] = [];
  if (Object.prototype.hasOwnProperty.call(body, "username")) {
    fields.push("username");
  }
  if (Object.prototype.hasOwnProperty.call(body, "email")) {
    fields.push("email");
  }
  if (Object.prototype.hasOwnProperty.call(body, "password")) {
    fields.push("password");
  }
  return fields;
}

export function mapGrpcError(e: unknown): { status: number; body: { error: string } } | null {
  const err = e as grpc.ServiceError;
  const code = err?.code;
  if (code === grpc.status.INVALID_ARGUMENT) {
    return { status: 400, body: { error: err.message } };
  }
  if (code === grpc.status.NOT_FOUND) {
    return { status: 404, body: { error: err.message } };
  }
  if (code === grpc.status.UNAUTHENTICATED) {
    return { status: 401, body: { error: err.message } };
  }
  if (code === grpc.status.PERMISSION_DENIED) {
    return { status: 403, body: { error: err.message } };
  }
  if (code === grpc.status.ALREADY_EXISTS) {
    return { status: 409, body: { error: err.message } };
  }
  return null;
}

/**
 * HTTP API: health, auth, users, roles, audit logs (delegates to Service-B gRPC).
 */
export function createApp(
  deps: AppDeps,
  corsOptions: CorsOptions = { origin: true },
): express.Application {
  const app = express();
  app.use(cors(corsOptions));
  app.use(express.json());

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "service-a" });
  });

  app.post("/auth/register", async (req: Request, res: Response) => {
    const { username, email, password } = req.body ?? {};
    try {
      const out = await deps.grpc.register(
        String(username),
        String(email),
        String(password),
      );
      await saveAuditBestEffort(deps, {
        path: "/auth/register",
        method: "POST",
        payload: {
          kind: "auth",
          action: "register",
          userId: out.user.id,
          username: out.user.username,
        },
      });
      res.status(201).json({ user: out.user });
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      console.error("POST /auth/register:", e);
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.post("/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body ?? {};
    try {
      const out = await deps.grpc.login(String(username), String(password));
      await saveAuditBestEffort(deps, {
        path: "/auth/login",
        method: "POST",
        payload: {
          kind: "auth",
          action: "login",
          userId: out.user.id,
          username: out.user.username,
        },
      });
      res.json({
        accessToken: out.accessToken,
        refreshToken: out.refreshToken,
        expiresInSeconds: Number(out.expiresInSeconds),
        user: out.user,
      });
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status === 401 ? 401 : m.status).json(m.body);
        return;
      }
      console.error("POST /auth/login:", e);
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.post("/auth/logout", async (req: Request, res: Response) => {
    const { refreshToken } = req.body ?? {};
    try {
      await deps.grpc.logout(authHeader(req), String(refreshToken ?? ""));
      await saveAuditBestEffort(deps, {
        path: "/auth/logout",
        method: "POST",
        payload: { kind: "auth", action: "logout" },
      });
      res.status(204).end();
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.get("/auth/me", async (req: Request, res: Response) => {
    try {
      const out = await deps.grpc.me(authHeader(req));
      await saveAuditBestEffort(deps, {
        path: "/auth/me",
        method: "GET",
        payload: { kind: "auth", action: "me", userId: out.user.id },
      });
      res.json({ user: out.user });
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.post("/auth/forgot-password", async (req: Request, res: Response) => {
    const { email } = req.body ?? {};
    try {
      const out = await deps.grpc.forgotPassword(String(email ?? ""));
      await saveAuditBestEffort(deps, {
        path: "/auth/forgot-password",
        method: "POST",
        payload: { kind: "auth", action: "password_reset_requested" },
      });
      const body: Record<string, unknown> = { message: out.message };
      if (out.resetToken !== undefined) {
        body.resetToken = out.resetToken;
      }
      res.json(body);
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.post("/auth/reset-password", async (req: Request, res: Response) => {
    const { token, newPassword } = req.body ?? {};
    try {
      await deps.grpc.resetPassword(String(token ?? ""), String(newPassword ?? ""));
      await saveAuditBestEffort(deps, {
        path: "/auth/reset-password",
        method: "POST",
        payload: { kind: "auth", action: "password_reset_completed" },
      });
      res.status(204).end();
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.get("/users", async (req: Request, res: Response) => {
    try {
      const q = pickQueryString(req.query.q);
      const role = pickQueryString(req.query.role);
      const users = await deps.grpc.listUsers(authHeader(req), {
        query: q,
        role,
      });
      await saveAuditBestEffort(deps, {
        path: "/users",
        method: "GET",
        payload: {
          kind: "user",
          action: "list",
          filters: { q: q ?? null, role: role ?? null },
        },
      });
      res.json(users);
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.get("/users/:id", async (req: Request, res: Response) => {
    const id = normalizeUserIdParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }
    try {
      const user = await deps.grpc.getUser(authHeader(req), id);
      await saveAuditBestEffort(deps, {
        path: `/users/${id}`,
        method: "GET",
        payload: { kind: "user", action: "get", userId: id },
      });
      res.json(user);
    } catch (e: unknown) {
      const mapped = mapGrpcError(e);
      if (mapped) {
        res.status(mapped.status).json(mapped.body);
        return;
      }
      console.error("GET /users/:id error:", (e as Error)?.message || e);
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.post("/users", async (req: Request, res: Response) => {
    const { username, email, password } = req.body ?? {};
    if (!username || !email) {
      res.status(400).json({ error: "username and email are required" });
      return;
    }
    try {
      const created = await deps.grpc.createUser(
        authHeader(req),
        String(username),
        String(email),
        password === undefined || password === null ? undefined : String(password),
      );
      await saveAuditBestEffort(deps, {
        path: "/users",
        method: "POST",
        payload: {
          kind: "user",
          action: "create",
          userId: created.id,
          username,
          email,
        },
        createdUserId: created.id,
      });
      res.status(201).json(created);
    } catch (e: unknown) {
      const mapped = mapGrpcError(e);
      if (mapped) {
        res.status(mapped.status).json(mapped.body);
        return;
      }
      console.error("POST /users error:", (e as grpc.ServiceError)?.message || e);
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.patch("/users/:id", async (req: Request, res: Response) => {
    const id = normalizeUserIdParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { username, email, password } = body;
    try {
      const u = await deps.grpc.updateUser(authHeader(req), id, {
        username: username === undefined ? undefined : String(username),
        email: email === undefined ? undefined : String(email),
        password: password === undefined ? undefined : String(password),
      });
      await saveAuditBestEffort(deps, {
        path: `/users/${id}`,
        method: "PATCH",
        payload: {
          kind: "user",
          action: "update",
          userId: id,
          fields: userPatchFieldNames(body),
        },
      });
      res.json(u);
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.delete("/users/:id", async (req: Request, res: Response) => {
    const id = normalizeUserIdParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }
    try {
      const u = await deps.grpc.deleteUser(authHeader(req), id);
      await saveAuditBestEffort(deps, {
        path: `/users/${id}`,
        method: "DELETE",
        payload: { kind: "user", action: "delete", userId: id },
      });
      res.json(u);
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.post("/users/:id/roles", async (req: Request, res: Response) => {
    const id = normalizeUserIdParam(req.params.id);
    const { roleId } = req.body ?? {};
    if (!id || !roleId) {
      res.status(400).json({ error: "id and roleId are required" });
      return;
    }
    try {
      await deps.grpc.assignUserRole(authHeader(req), id, String(roleId));
      await saveAuditBestEffort(deps, {
        path: `/users/${id}/roles`,
        method: "POST",
        payload: {
          kind: "user_role",
          action: "assign",
          userId: id,
          roleId: String(roleId),
        },
      });
      res.status(204).end();
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.delete("/users/:id/roles/:roleId", async (req: Request, res: Response) => {
    const id = normalizeUserIdParam(req.params.id);
    const roleId = normalizeUserIdParam(req.params.roleId);
    if (!id || !roleId) {
      res.status(400).json({ error: "id and roleId are required" });
      return;
    }
    try {
      await deps.grpc.removeUserRole(authHeader(req), id, roleId);
      await saveAuditBestEffort(deps, {
        path: `/users/${id}/roles/${roleId}`,
        method: "DELETE",
        payload: {
          kind: "user_role",
          action: "remove",
          userId: id,
          roleId,
        },
      });
      res.status(204).end();
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.get("/roles", async (req: Request, res: Response) => {
    try {
      const q = pickQueryString(req.query.q);
      const roles = await deps.grpc.listRoles(authHeader(req), { query: q });
      await saveAuditBestEffort(deps, {
        path: "/roles",
        method: "GET",
        payload: { kind: "role", action: "list", filters: { q: q ?? null } },
      });
      res.json(roles);
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.post("/roles", async (req: Request, res: Response) => {
    const { name } = req.body ?? {};
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    try {
      const r = await deps.grpc.createRole(authHeader(req), String(name));
      await saveAuditBestEffort(deps, {
        path: "/roles",
        method: "POST",
        payload: {
          kind: "role",
          action: "create",
          roleId: r.id,
          name: r.name,
        },
      });
      res.status(201).json(r);
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.get("/roles/:id", async (req: Request, res: Response) => {
    const id = normalizeUserIdParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }
    try {
      const r = await deps.grpc.getRole(authHeader(req), id);
      await saveAuditBestEffort(deps, {
        path: `/roles/${id}`,
        method: "GET",
        payload: { kind: "role", action: "get", roleId: id },
      });
      res.json(r);
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.patch("/roles/:id", async (req: Request, res: Response) => {
    const id = normalizeUserIdParam(req.params.id);
    const { name } = req.body ?? {};
    if (!id || !name) {
      res.status(400).json({ error: "id and name are required" });
      return;
    }
    try {
      const r = await deps.grpc.updateRole(authHeader(req), id, String(name));
      await saveAuditBestEffort(deps, {
        path: `/roles/${id}`,
        method: "PATCH",
        payload: {
          kind: "role",
          action: "update",
          roleId: id,
          name: r.name,
        },
      });
      res.json(r);
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.delete("/roles/:id", async (req: Request, res: Response) => {
    const id = normalizeUserIdParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }
    try {
      const r = await deps.grpc.deleteRole(authHeader(req), id);
      await saveAuditBestEffort(deps, {
        path: `/roles/${id}`,
        method: "DELETE",
        payload: {
          kind: "role",
          action: "delete",
          roleId: id,
          name: r.name,
        },
      });
      res.json(r);
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  app.get("/audit-logs", async (req: Request, res: Response) => {
    const auth = authHeader(req);
    if (!auth) {
      res.status(401).json({ error: "authentication required" });
      return;
    }
    try {
      const { user } = await deps.grpc.me(auth);
      if (!user.roles?.includes("admin")) {
        res.status(403).json({ error: "admin access required" });
        return;
      }
      const pathF = pickQueryString(req.query.path);
      const methodF = pickQueryString(req.query.method);
      const q = pickQueryString(req.query.q);
      let limit = 100;
      const limRaw = req.query.limit;
      if (typeof limRaw === "string" && limRaw.trim() !== "") {
        const n = Number.parseInt(limRaw, 10);
        if (!Number.isNaN(n)) {
          limit = n;
        }
      }
      limit = Math.min(500, Math.max(1, limit));
      const rows = await deps.listAuditLogs({
        path: pathF,
        method: methodF,
        q,
        limit,
      });
      res.json(rows);
    } catch (e: unknown) {
      const m = mapGrpcError(e);
      if (m) {
        res.status(m.status).json(m.body);
        return;
      }
      console.error("GET /audit-logs error:", e);
      res.status(500).json({ error: "failed to load audit logs" });
    }
  });

  return app;
}
