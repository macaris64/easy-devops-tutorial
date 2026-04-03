import request from "supertest";
import * as grpc from "@grpc/grpc-js";
import { createApp } from "../src/app";
import type { GrpcBackend } from "../src/grpcBackend";
import { createGrpcBackendMock, defaultGrpcUser } from "./grpcBackendMock";

function deps(
  over: Partial<{
    grpc: Partial<GrpcBackend>;
    saveAuditLog: (e: {
      path: string;
      method: string;
      payload: Record<string, unknown>;
      createdUserId?: string;
    }) => Promise<void>;
    listAuditLogs: () => Promise<
      {
        id: string;
        path: string;
        method: string;
        createdAt: string;
        payload: Record<string, unknown>;
      }[]
    >;
  }> = {},
) {
  return {
    grpc: createGrpcBackendMock(over.grpc ?? {}),
    saveAuditLog: over.saveAuditLog ?? (async () => {}),
    listAuditLogs: over.listAuditLogs ?? (async () => []),
  };
}

describe("createApp", () => {
  it("GET /health", async () => {
    const app = createApp(deps());
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", service: "service-a" });
  });

  it("POST /users validates body", async () => {
    const app = createApp(deps());
    const res = await request(app).post("/users").send({ username: "a" });
    expect(res.status).toBe(400);
  });

  it("POST /users requires username when email present", async () => {
    const app = createApp(deps());
    const res = await request(app).post("/users").send({ email: "e@e.com" });
    expect(res.status).toBe(400);
  });

  it("POST /users rejects empty string username", async () => {
    const app = createApp(deps());
    const res = await request(app)
      .post("/users")
      .send({ username: "", email: "e@e.com" });
    expect(res.status).toBe(400);
  });

  it("POST /users creates user and audit", async () => {
    const audits: unknown[] = [];
    const app = createApp(
      deps({
        saveAuditLog: async (e) => {
          audits.push(e);
        },
      }),
    );
    const res = await request(app)
      .post("/users")
      .send({ username: "u", email: "e@e.com" });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe("id-1");
    expect(audits).toHaveLength(1);
  });

  it("POST /users passes explicit password when provided including null coerced", async () => {
    let seenPwd: string | undefined = "unset";
    const app = createApp(
      deps({
        grpc: {
          createUser: async (_h, _u, _e, pwd) => {
            seenPwd = pwd;
            return { ...defaultGrpcUser, id: "id-1" };
          },
        },
      }),
    );
    const res = await request(app)
      .post("/users")
      .send({ username: "u", email: "e@e.com", password: null });
    expect(res.status).toBe(201);
    expect(seenPwd).toBeUndefined();
    const res2 = await request(app)
      .post("/users")
      .send({ username: "u2", email: "e2@e.com", password: "secret" });
    expect(res2.status).toBe(201);
    expect(seenPwd).toBe("secret");
  });

  it("maps INVALID_ARGUMENT to 400", async () => {
    const app = createApp(
      deps({
        grpc: {
          createUser: async () => {
            const e = Object.assign(new Error("bad"), {
              code: grpc.status.INVALID_ARGUMENT,
            }) as grpc.ServiceError;
            throw e;
          },
        },
      }),
    );
    const res = await request(app)
      .post("/users")
      .send({ username: "u", email: "e@e.com" });
    expect(res.status).toBe(400);
  });

  it("maps NOT_FOUND to 404", async () => {
    const app = createApp(
      deps({
        grpc: {
          createUser: async () => {
            const e = Object.assign(new Error("nf"), {
              code: grpc.status.NOT_FOUND,
            }) as grpc.ServiceError;
            throw e;
          },
        },
      }),
    );
    const res = await request(app)
      .post("/users")
      .send({ username: "u", email: "e@e.com" });
    expect(res.status).toBe(404);
  });

  it("maps other errors to 502", async () => {
    const app = createApp(
      deps({
        grpc: {
          createUser: async () => {
            throw new Error("boom");
          },
        },
      }),
    );
    const res = await request(app)
      .post("/users")
      .send({ username: "u", email: "e@e.com" });
    expect(res.status).toBe(502);
  });

  it("maps non-ServiceError without message to 502", async () => {
    const app = createApp(
      deps({
        grpc: {
          createUser: async () => {
            throw Object.assign(new Error(), { message: "" });
          },
        },
      }),
    );
    const res = await request(app)
      .post("/users")
      .send({ username: "u", email: "e@e.com" });
    expect(res.status).toBe(502);
  });

  it("GET /users/:id returns user", async () => {
    const app = createApp(deps());
    const res = await request(app).get("/users/abc-123");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: "abc-123",
      username: "u",
      email: "e@e.com",
      roles: [],
    });
  });

  it("GET /users/:id rejects blank id", async () => {
    const app = createApp(deps());
    const res = await request(app).get("/users/%20");
    expect(res.status).toBe(400);
  });

  it("GET /users/:id maps NOT_FOUND to 404", async () => {
    const app = createApp(
      deps({
        grpc: {
          getUser: async () => {
            const e = Object.assign(new Error("nf"), {
              code: grpc.status.NOT_FOUND,
            }) as grpc.ServiceError;
            throw e;
          },
        },
      }),
    );
    const res = await request(app).get("/users/nope");
    expect(res.status).toBe(404);
  });

  it("GET /users/:id maps INVALID_ARGUMENT to 400", async () => {
    const app = createApp(
      deps({
        grpc: {
          getUser: async () => {
            const e = Object.assign(new Error("bad id"), {
              code: grpc.status.INVALID_ARGUMENT,
            }) as grpc.ServiceError;
            throw e;
          },
        },
      }),
    );
    const res = await request(app).get("/users/bad");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("bad id");
  });

  it("GET /users/:id maps other errors to 502", async () => {
    const app = createApp(
      deps({
        grpc: {
          getUser: async () => {
            throw new Error("upstream");
          },
        },
      }),
    );
    const res = await request(app).get("/users/any");
    expect(res.status).toBe(502);
  });

  it("GET /users/:id maps non-user gRPC codes to 502", async () => {
    const app = createApp(
      deps({
        grpc: {
          getUser: async () => {
            const e = Object.assign(new Error("internal"), {
              code: grpc.status.INTERNAL,
            }) as grpc.ServiceError;
            throw e;
          },
        },
      }),
    );
    const res = await request(app).get("/users/u1");
    expect(res.status).toBe(502);
  });

  it("GET /audit-logs returns rows", async () => {
    const app = createApp(
      deps({
        listAuditLogs: async () => [
          {
            id: "1",
            path: "/users",
            method: "POST",
            createdAt: "2026-01-01T00:00:00.000Z",
            payload: {},
          },
        ],
      }),
    );
    const res = await request(app).get("/audit-logs");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].path).toBe("/users");
  });

  it("GET /audit-logs maps errors to 500", async () => {
    const app = createApp(
      deps({
        listAuditLogs: async () => {
          throw new Error("db down");
        },
      }),
    );
    const res = await request(app).get("/audit-logs");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("failed to load audit logs");
  });

  it("POST /auth/login returns tokens", async () => {
    const app = createApp(deps());
    const res = await request(app)
      .post("/auth/login")
      .send({ username: "u", password: "p" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe("a");
    expect(res.body.user.username).toBe("u");
  });

  it("POST /auth/login maps INVALID_ARGUMENT to 400", async () => {
    const app = createApp(
      deps({
        grpc: {
          login: async () => {
            const e = Object.assign(new Error("bad creds"), {
              code: grpc.status.INVALID_ARGUMENT,
            }) as grpc.ServiceError;
            throw e;
          },
        },
      }),
    );
    const res = await request(app)
      .post("/auth/login")
      .send({ username: "u", password: "p" });
    expect(res.status).toBe(400);
  });

  it("GET /auth/me forwards authorization", async () => {
    let hdr: string | undefined;
    const app = createApp(
      deps({
        grpc: {
          me: async (h) => {
            hdr = h;
            return { user: defaultGrpcUser };
          },
        },
      }),
    );
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer t");
    expect(res.status).toBe(200);
    expect(hdr).toBe("Bearer t");
  });

  it("POST /auth/register", async () => {
    const res = await request(createApp(deps()))
      .post("/auth/register")
      .send({ username: "a", email: "a@a.com", password: "password12" });
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
  });

  it("POST /auth/logout", async () => {
    const res = await request(createApp(deps()))
      .post("/auth/logout")
      .send({ refreshToken: "r" });
    expect(res.status).toBe(204);
  });

  it("POST /auth/forgot-password", async () => {
    const res = await request(createApp(deps()))
      .post("/auth/forgot-password")
      .send({ email: "a@a.com" });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("ok");
  });

  it("POST /auth/reset-password", async () => {
    const res = await request(createApp(deps()))
      .post("/auth/reset-password")
      .send({ token: "t", newPassword: "password12" });
    expect(res.status).toBe(204);
  });

  it("GET /users list", async () => {
    const res = await request(createApp(deps())).get("/users");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("PATCH /users/:id", async () => {
    const res = await request(createApp(deps()))
      .patch("/users/u1")
      .send({ username: "n" });
    expect(res.status).toBe(200);
  });

  it("DELETE /users/:id", async () => {
    const res = await request(createApp(deps())).delete("/users/u1");
    expect(res.status).toBe(200);
  });

  it("POST /users/:id/roles", async () => {
    const res = await request(createApp(deps()))
      .post("/users/u1/roles")
      .send({ roleId: "r1" });
    expect(res.status).toBe(204);
  });

  it("DELETE /users/:id/roles/:roleId", async () => {
    const res = await request(createApp(deps())).delete("/users/u1/roles/r1");
    expect(res.status).toBe(204);
  });

  it("GET /roles", async () => {
    const res = await request(createApp(deps())).get("/roles");
    expect(res.status).toBe(200);
  });

  it("POST /roles", async () => {
    const res = await request(createApp(deps())).post("/roles").send({ name: "x" });
    expect(res.status).toBe(201);
  });

  it("GET /roles/:id", async () => {
    const res = await request(createApp(deps())).get("/roles/r1");
    expect(res.status).toBe(200);
  });

  it("PATCH /roles/:id", async () => {
    const res = await request(createApp(deps()))
      .patch("/roles/r1")
      .send({ name: "y" });
    expect(res.status).toBe(200);
  });

  it("DELETE /roles/:id", async () => {
    const res = await request(createApp(deps())).delete("/roles/r1");
    expect(res.status).toBe(200);
  });

  it("maps UNAUTHENTICATED to 401", async () => {
    const app = createApp(
      deps({
        grpc: {
          listUsers: async () => {
            const e = Object.assign(new Error("auth"), {
              code: grpc.status.UNAUTHENTICATED,
            }) as grpc.ServiceError;
            throw e;
          },
        },
      }),
    );
    const res = await request(app).get("/users");
    expect(res.status).toBe(401);
  });

  it("maps PERMISSION_DENIED to 403", async () => {
    const app = createApp(
      deps({
        grpc: {
          deleteRole: async () => {
            const e = Object.assign(new Error("forbidden"), {
              code: grpc.status.PERMISSION_DENIED,
            }) as grpc.ServiceError;
            throw e;
          },
        },
      }),
    );
    const res = await request(app).delete("/roles/r1");
    expect(res.status).toBe(403);
  });

  it("maps ALREADY_EXISTS to 409", async () => {
    const app = createApp(
      deps({
        grpc: {
          register: async () => {
            const e = Object.assign(new Error("exists"), {
              code: grpc.status.ALREADY_EXISTS,
            }) as grpc.ServiceError;
            throw e;
          },
        },
      }),
    );
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "a", email: "a@a.com", password: "password12" });
    expect(res.status).toBe(409);
  });

  it("POST /auth/forgot-password includes resetToken when backend returns it", async () => {
    const app = createApp(
      deps({
        grpc: {
          forgotPassword: async () => ({
            message: "ok",
            resetToken: "dev-only",
          }),
        },
      }),
    );
    const res = await request(app)
      .post("/auth/forgot-password")
      .send({ email: "a@a.com" });
    expect(res.status).toBe(200);
    expect(res.body.resetToken).toBe("dev-only");
  });

  it("PATCH /users/:id rejects blank id", async () => {
    const res = await request(createApp(deps()))
      .patch("/users/%20")
      .send({ username: "n" });
    expect(res.status).toBe(400);
  });

  it("POST /roles rejects missing name", async () => {
    const res = await request(createApp(deps())).post("/roles").send({});
    expect(res.status).toBe(400);
  });

  it("POST /users/:id/roles rejects missing roleId", async () => {
    const res = await request(createApp(deps()))
      .post("/users/u1/roles")
      .send({});
    expect(res.status).toBe(400);
  });
});
