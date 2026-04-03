import cors from "cors";
import type { CorsOptions } from "cors";
import express, { Request, Response } from "express";
import * as grpc from "@grpc/grpc-js";
import type { GrpcBackend } from "./grpcBackend";
import { normalizeUserIdParam } from "./paramUtils";

export interface AuditLogRow {
  id: string;
  path: string;
  method: string;
  createdAt: string;
  payload: Record<string, unknown>;
  createdUserId?: string;
}

export interface AppDeps {
  grpc: GrpcBackend;
  saveAuditLog: (entry: {
    path: string;
    method: string;
    payload: Record<string, unknown>;
    createdUserId?: string;
  }) => Promise<void>;
  listAuditLogs: () => Promise<AuditLogRow[]>;
}

function authHeader(req: Request): string | undefined {
  const h = req.headers.authorization;
  return typeof h === "string" && h.length > 0 ? h : undefined;
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
      const users = await deps.grpc.listUsers(authHeader(req));
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
      await deps.saveAuditLog({
        path: "/users",
        method: "POST",
        payload: { username, email },
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
    const { username, email, password } = req.body ?? {};
    try {
      const u = await deps.grpc.updateUser(authHeader(req), id, {
        username: username === undefined ? undefined : String(username),
        email: email === undefined ? undefined : String(email),
        password: password === undefined ? undefined : String(password),
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
      const roles = await deps.grpc.listRoles(authHeader(req));
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

  app.get("/audit-logs", async (_req: Request, res: Response) => {
    try {
      const rows = await deps.listAuditLogs();
      res.json(rows);
    } catch (e) {
      console.error("GET /audit-logs error:", e);
      res.status(500).json({ error: "failed to load audit logs" });
    }
  });

  return app;
}
