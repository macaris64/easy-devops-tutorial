import request from "supertest";
import * as grpc from "@grpc/grpc-js";
import { createApp } from "../src/app";
import type { GrpcBackend } from "../src/grpcBackend";

const baseUser = {
  id: "id-1",
  username: "u",
  email: "e@e.com",
  roles: [] as string[],
};

function grpcMock(over: Partial<GrpcBackend> = {}): GrpcBackend {
  const g: GrpcBackend = {
    register: async () => ({ user: { ...baseUser } }),
    login: async () => ({
      accessToken: "a",
      refreshToken: "r",
      expiresInSeconds: "3600",
      user: { ...baseUser },
    }),
    logout: async () => {},
    me: async () => ({ user: { ...baseUser } }),
    forgotPassword: async () => ({ message: "ok" }),
    resetPassword: async () => {},
    getUser: async (_h, id) => ({ ...baseUser, id }),
    createUser: async (_h, u, e) => ({
      ...baseUser,
      id: "id-1",
      username: u,
      email: e,
    }),
    listUsers: async () => [{ ...baseUser }],
    updateUser: async (_h, id) => ({ ...baseUser, id }),
    deleteUser: async (_h, id) => ({ ...baseUser, id }),
    listRoles: async () => [],
    createRole: async () => ({ id: "r", name: "role" }),
    getRole: async () => ({ id: "r", name: "role" }),
    updateRole: async () => ({ id: "r", name: "role" }),
    deleteRole: async () => ({ id: "r", name: "role" }),
    assignUserRole: async () => {},
    removeUserRole: async () => {},
  };
  return { ...g, ...over };
}

function err(code: number, message: string): grpc.ServiceError {
  return Object.assign(new Error(message), { code }) as grpc.ServiceError;
}

describe("createApp mapped gRPC errors on routes", () => {
  const deps = (grpcOver: Partial<GrpcBackend>) => ({
    grpc: grpcMock(grpcOver),
    saveAuditLog: async () => {},
    listAuditLogs: async () => [],
  });

  it("POST /auth/login maps UNAUTHENTICATED to 401", async () => {
    const res = await request(
      createApp(
        deps({
          login: async () => {
            throw err(grpc.status.UNAUTHENTICATED, "bad");
          },
        }),
      ),
    )
      .post("/auth/login")
      .send({ username: "u", password: "p" });
    expect(res.status).toBe(401);
  });

  it("POST /auth/logout maps gRPC error", async () => {
    const res = await request(
      createApp(
        deps({
          logout: async () => {
            throw err(grpc.status.UNAUTHENTICATED, "no");
          },
        }),
      ),
    )
      .post("/auth/logout")
      .send({ refreshToken: "r" });
    expect(res.status).toBe(401);
  });

  it("GET /auth/me maps gRPC error", async () => {
    const res = await request(
      createApp(
        deps({
          me: async () => {
            throw err(grpc.status.UNAUTHENTICATED, "no");
          },
        }),
      ),
    ).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("POST /auth/forgot-password maps gRPC error", async () => {
    const res = await request(
      createApp(
        deps({
          forgotPassword: async () => {
            throw err(grpc.status.INVALID_ARGUMENT, "bad email");
          },
        }),
      ),
    )
      .post("/auth/forgot-password")
      .send({ email: "x" });
    expect(res.status).toBe(400);
  });

  it("POST /auth/reset-password maps gRPC error", async () => {
    const res = await request(
      createApp(
        deps({
          resetPassword: async () => {
            throw err(grpc.status.NOT_FOUND, "token");
          },
        }),
      ),
    )
      .post("/auth/reset-password")
      .send({ token: "t", newPassword: "password12" });
    expect(res.status).toBe(404);
  });

  it("PATCH /users/:id maps gRPC error", async () => {
    const res = await request(
      createApp(
        deps({
          updateUser: async () => {
            throw err(grpc.status.PERMISSION_DENIED, "no");
          },
        }),
      ),
    )
      .patch("/users/u1")
      .send({ username: "n" });
    expect(res.status).toBe(403);
  });

  it("DELETE /users/:id maps gRPC error", async () => {
    const res = await request(
      createApp(
        deps({
          deleteUser: async () => {
            throw err(grpc.status.NOT_FOUND, "gone");
          },
        }),
      ),
    ).delete("/users/u1");
    expect(res.status).toBe(404);
  });

  it("POST /users/:id/roles maps gRPC error", async () => {
    const res = await request(
      createApp(
        deps({
          assignUserRole: async () => {
            throw err(grpc.status.PERMISSION_DENIED, "no");
          },
        }),
      ),
    )
      .post("/users/u1/roles")
      .send({ roleId: "r1" });
    expect(res.status).toBe(403);
  });

  it("DELETE /users/:id/roles/:roleId maps gRPC error", async () => {
    const res = await request(
      createApp(
        deps({
          removeUserRole: async () => {
            throw err(grpc.status.NOT_FOUND, "no");
          },
        }),
      ),
    ).delete("/users/u1/roles/r1");
    expect(res.status).toBe(404);
  });

  it("GET /roles maps gRPC error", async () => {
    const res = await request(
      createApp(
        deps({
          listRoles: async () => {
            throw err(grpc.status.UNAUTHENTICATED, "no");
          },
        }),
      ),
    ).get("/roles");
    expect(res.status).toBe(401);
  });

  it("POST /roles maps gRPC error", async () => {
    const res = await request(
      createApp(
        deps({
          createRole: async () => {
            throw err(grpc.status.ALREADY_EXISTS, "dup");
          },
        }),
      ),
    )
      .post("/roles")
      .send({ name: "x" });
    expect(res.status).toBe(409);
  });

  it("GET /roles/:id maps gRPC error", async () => {
    const res = await request(
      createApp(
        deps({
          getRole: async () => {
            throw err(grpc.status.NOT_FOUND, "no");
          },
        }),
      ),
    ).get("/roles/r1");
    expect(res.status).toBe(404);
  });

  it("PATCH /roles/:id maps gRPC error", async () => {
    const res = await request(
      createApp(
        deps({
          updateRole: async () => {
            throw err(grpc.status.INVALID_ARGUMENT, "bad");
          },
        }),
      ),
    )
      .patch("/roles/r1")
      .send({ name: "y" });
    expect(res.status).toBe(400);
  });

  it("DELETE /roles/:id maps gRPC error", async () => {
    const res = await request(
      createApp(
        deps({
          deleteRole: async () => {
            throw err(grpc.status.NOT_FOUND, "no");
          },
        }),
      ),
    ).delete("/roles/r1");
    expect(res.status).toBe(404);
  });
});
