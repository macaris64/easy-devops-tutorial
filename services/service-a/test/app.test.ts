import request from "supertest";
import * as grpc from "@grpc/grpc-js";
import { createApp } from "../src/app";

describe("createApp", () => {
  it("GET /health", async () => {
    const app = createApp({
      createUser: async () => ({ id: "x", username: "x", email: "x" }),
      saveAuditLog: async () => {},
    });
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", service: "service-a" });
  });

  it("POST /users validates body", async () => {
    const app = createApp({
      createUser: async () => ({ id: "x", username: "x", email: "x" }),
      saveAuditLog: async () => {},
    });
    const res = await request(app)
      .post("/users")
      .send({ username: "a" });
    expect(res.status).toBe(400);
  });

  it("POST /users rejects empty string username", async () => {
    const app = createApp({
      createUser: async () => ({ id: "x", username: "x", email: "x" }),
      saveAuditLog: async () => {},
    });
    const res = await request(app)
      .post("/users")
      .send({ username: "", email: "e@e.com" });
    expect(res.status).toBe(400);
  });

  it("POST /users creates user and audit", async () => {
    const audits: unknown[] = [];
    const app = createApp({
      createUser: async () => ({
        id: "id-1",
        username: "u",
        email: "e@e.com",
      }),
      saveAuditLog: async (e) => {
        audits.push(e);
      },
    });
    const res = await request(app)
      .post("/users")
      .send({ username: "u", email: "e@e.com" });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe("id-1");
    expect(audits).toHaveLength(1);
  });

  it("maps INVALID_ARGUMENT to 400", async () => {
    const app = createApp({
      createUser: async () => {
        const e = Object.assign(new Error("bad"), {
          code: grpc.status.INVALID_ARGUMENT,
        }) as grpc.ServiceError;
        throw e;
      },
      saveAuditLog: async () => {},
    });
    const res = await request(app)
      .post("/users")
      .send({ username: "u", email: "e@e.com" });
    expect(res.status).toBe(400);
  });

  it("maps NOT_FOUND to 404", async () => {
    const app = createApp({
      createUser: async () => {
        const e = Object.assign(new Error("nf"), {
          code: grpc.status.NOT_FOUND,
        }) as grpc.ServiceError;
        throw e;
      },
      saveAuditLog: async () => {},
    });
    const res = await request(app)
      .post("/users")
      .send({ username: "u", email: "e@e.com" });
    expect(res.status).toBe(404);
  });

  it("maps other errors to 502", async () => {
    const app = createApp({
      createUser: async () => {
        throw new Error("boom");
      },
      saveAuditLog: async () => {},
    });
    const res = await request(app)
      .post("/users")
      .send({ username: "u", email: "e@e.com" });
    expect(res.status).toBe(502);
  });

  it("maps non-ServiceError without message to 502", async () => {
    const app = createApp({
      createUser: async () => {
        throw Object.assign(new Error(), { message: "" });
      },
      saveAuditLog: async () => {},
    });
    const res = await request(app)
      .post("/users")
      .send({ username: "u", email: "e@e.com" });
    expect(res.status).toBe(502);
  });
});
