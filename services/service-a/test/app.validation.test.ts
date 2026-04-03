import request from "supertest";
import { createApp } from "../src/app";
import type { GrpcBackend } from "../src/grpcBackend";

const baseUser = {
  id: "id-1",
  username: "u",
  email: "e@e.com",
  roles: [] as string[],
};

function grpcMock(): GrpcBackend {
  return {
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
}

describe("createApp param validation branches", () => {
  const deps = () => ({
    grpc: grpcMock(),
    saveAuditLog: async () => {},
    listAuditLogs: async () => [],
  });

  it("DELETE /users/:id rejects blank id", async () => {
    const res = await request(createApp(deps())).delete("/users/%20");
    expect(res.status).toBe(400);
  });

  it("DELETE /users/:id/roles/:roleId rejects blank roleId", async () => {
    const res = await request(createApp(deps())).delete("/users/u1/roles/%20");
    expect(res.status).toBe(400);
  });

  it("GET /roles/:id rejects blank id", async () => {
    const res = await request(createApp(deps())).get("/roles/%20");
    expect(res.status).toBe(400);
  });

  it("PATCH /roles/:id rejects blank id", async () => {
    const res = await request(createApp(deps()))
      .patch("/roles/%20")
      .send({ name: "y" });
    expect(res.status).toBe(400);
  });

  it("PATCH /roles/:id rejects missing name", async () => {
    const res = await request(createApp(deps())).patch("/roles/r1").send({});
    expect(res.status).toBe(400);
  });

  it("DELETE /roles/:id rejects blank id", async () => {
    const res = await request(createApp(deps())).delete("/roles/%20");
    expect(res.status).toBe(400);
  });
});
