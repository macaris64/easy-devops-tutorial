import request from "supertest";
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

function boom(): never {
  throw new Error("upstream");
}

describe("createApp upstream 502 paths", () => {
  const deps = (grpc: Partial<GrpcBackend>) => ({
    grpc: grpcMock(grpc),
    saveAuditLog: async () => {},
    listAuditLogs: async () => [],
  });

  it("POST /auth/register", async () => {
    const res = await request(createApp(deps({ register: boom })))
      .post("/auth/register")
      .send({ username: "a", email: "a@a.com", password: "password12" });
    expect(res.status).toBe(502);
  });

  it("POST /auth/login generic error", async () => {
    const res = await request(createApp(deps({ login: boom })))
      .post("/auth/login")
      .send({ username: "u", password: "p" });
    expect(res.status).toBe(502);
  });

  it("POST /auth/logout", async () => {
    const res = await request(createApp(deps({ logout: boom })))
      .post("/auth/logout")
      .send({ refreshToken: "r" });
    expect(res.status).toBe(502);
  });

  it("GET /auth/me", async () => {
    const res = await request(createApp(deps({ me: boom }))).get("/auth/me");
    expect(res.status).toBe(502);
  });

  it("POST /auth/forgot-password", async () => {
    const res = await request(createApp(deps({ forgotPassword: boom })))
      .post("/auth/forgot-password")
      .send({ email: "a@a.com" });
    expect(res.status).toBe(502);
  });

  it("POST /auth/reset-password", async () => {
    const res = await request(createApp(deps({ resetPassword: boom })))
      .post("/auth/reset-password")
      .send({ token: "t", newPassword: "password12" });
    expect(res.status).toBe(502);
  });

  it("GET /users list", async () => {
    const res = await request(createApp(deps({ listUsers: boom }))).get("/users");
    expect(res.status).toBe(502);
  });

  it("PATCH /users/:id", async () => {
    const res = await request(createApp(deps({ updateUser: boom })))
      .patch("/users/u1")
      .send({ username: "n" });
    expect(res.status).toBe(502);
  });

  it("DELETE /users/:id", async () => {
    const res = await request(createApp(deps({ deleteUser: boom }))).delete(
      "/users/u1",
    );
    expect(res.status).toBe(502);
  });

  it("POST /users/:id/roles", async () => {
    const res = await request(createApp(deps({ assignUserRole: boom })))
      .post("/users/u1/roles")
      .send({ roleId: "r1" });
    expect(res.status).toBe(502);
  });

  it("DELETE /users/:id/roles/:roleId", async () => {
    const res = await request(
      createApp(deps({ removeUserRole: boom })),
    ).delete("/users/u1/roles/r1");
    expect(res.status).toBe(502);
  });

  it("GET /roles", async () => {
    const res = await request(createApp(deps({ listRoles: boom }))).get("/roles");
    expect(res.status).toBe(502);
  });

  it("POST /roles", async () => {
    const res = await request(createApp(deps({ createRole: boom })))
      .post("/roles")
      .send({ name: "x" });
    expect(res.status).toBe(502);
  });

  it("GET /roles/:id", async () => {
    const res = await request(createApp(deps({ getRole: boom }))).get("/roles/r1");
    expect(res.status).toBe(502);
  });

  it("PATCH /roles/:id", async () => {
    const res = await request(createApp(deps({ updateRole: boom })))
      .patch("/roles/r1")
      .send({ name: "y" });
    expect(res.status).toBe(502);
  });

  it("DELETE /roles/:id", async () => {
    const res = await request(createApp(deps({ deleteRole: boom }))).delete(
      "/roles/r1",
    );
    expect(res.status).toBe(502);
  });
});
