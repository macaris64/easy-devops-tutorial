import express, { Request, Response } from "express";
import * as grpc from "@grpc/grpc-js";

export interface AppDeps {
  createUser: (username: string, email: string) => Promise<{
    id: string;
    username: string;
    email: string;
  }>;
  saveAuditLog: (entry: {
    path: string;
    method: string;
    payload: Record<string, unknown>;
    createdUserId?: string;
  }) => Promise<void>;
}

/**
 * HTTP API: health check and user creation (delegates to gRPC via deps).
 */
export function createApp(deps: AppDeps): express.Application {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "service-a" });
  });

  app.post("/users", async (req: Request, res: Response) => {
    const { username, email } = req.body ?? {};
    if (!username || !email) {
      res.status(400).json({ error: "username and email are required" });
      return;
    }

    try {
      const created = await deps.createUser(username, email);
      await deps.saveAuditLog({
        path: "/users",
        method: "POST",
        payload: { username, email },
        createdUserId: created.id,
      });
      res.status(201).json(created);
    } catch (e: unknown) {
      const err = e as grpc.ServiceError;
      const code = err?.code;
      if (code === grpc.status.INVALID_ARGUMENT) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (code === grpc.status.NOT_FOUND) {
        res.status(404).json({ error: err.message });
        return;
      }
      console.error("POST /users error:", err?.message || e);
      res.status(502).json({ error: "upstream gRPC call failed" });
    }
  });

  return app;
}
