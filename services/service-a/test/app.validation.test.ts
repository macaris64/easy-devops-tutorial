import request from "supertest";
import { createApp } from "../src/app";
import { createGrpcBackendMock } from "./grpcBackendMock";

describe("createApp param validation branches", () => {
  const deps = () => ({
    grpc: createGrpcBackendMock(),
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
