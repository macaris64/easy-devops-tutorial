import path from "path";
import * as grpc from "@grpc/grpc-js";
import { buildGrpcBackend, buildGrpcBackendFromEnv } from "../src/grpcBackend";

type GrpcCB = (err: grpc.ServiceError | null, res?: unknown) => void;

function serviceCtor(
  handlers: Record<string, (req: unknown, md: grpc.Metadata, cb: GrpcCB) => void>,
): grpc.ServiceClientConstructor {
  const Ctor = function MockClient() {
    return handlers;
  } as unknown as grpc.ServiceClientConstructor;
  return Ctor;
}

const user = { id: "1", username: "u", email: "e@e.com", roles: ["admin"] };

describe("buildGrpcBackend", () => {
  const UserService = serviceCtor({
    GetUser(_req, _md, cb) {
      cb(null, user);
    },
    CreateUser(_req, _md, cb) {
      cb(null, user);
    },
    ListUsers(_req, _md, cb) {
      cb(null, { users: [user] });
    },
    UpdateUser(_req, _md, cb) {
      cb(null, user);
    },
    DeleteUser(_req, _md, cb) {
      cb(null, user);
    },
  });

  const AuthService = serviceCtor({
    Register(_req, _md, cb) {
      cb(null, { user });
    },
    Login(_req, _md, cb) {
      cb(null, {
        access_token: "a",
        refresh_token: "r",
        expires_in_seconds: 3600,
        user,
      });
    },
    Logout(_req, _md, cb) {
      cb(null, {});
    },
    Me(_req, _md, cb) {
      cb(null, { user });
    },
    ForgotPassword(_req, _md, cb) {
      cb(null, { message: "sent", reset_token: "dev-token" });
    },
    ResetPassword(_req, _md, cb) {
      cb(null, {});
    },
  });

  const RoleService = serviceCtor({
    ListRoles(_req, _md, cb) {
      cb(null, { roles: [{ id: "r1", name: "admin" }] });
    },
    CreateRole(_req, _md, cb) {
      cb(null, { id: "r2", name: "new" });
    },
    GetRole(_req, _md, cb) {
      cb(null, { id: "r1", name: "admin" });
    },
    UpdateRole(_req, _md, cb) {
      cb(null, { id: "r1", name: "updated" });
    },
    DeleteRole(_req, _md, cb) {
      cb(null, { id: "r1", name: "admin" });
    },
    AssignUserRole(_req, _md, cb) {
      cb(null, {});
    },
    RemoveUserRole(_req, _md, cb) {
      cb(null, {});
    },
  });

  const backend = buildGrpcBackend(
    UserService,
    AuthService,
    RoleService,
    "localhost:9",
  );

  it("register maps user", async () => {
    const out = await backend.register("u", "e@e.com", "pw");
    expect(out.user).toEqual(user);
  });

  it("login maps tokens and user", async () => {
    const out = await backend.login("u", "pw");
    expect(out.accessToken).toBe("a");
    expect(out.refreshToken).toBe("r");
    expect(out.expiresInSeconds).toBe("3600");
    expect(out.user).toEqual(user);
  });

  it("logout passes refresh token with or without auth metadata", async () => {
    await expect(backend.logout("Bearer x", "r")).resolves.toBeUndefined();
    await expect(backend.logout(undefined, "r")).resolves.toBeUndefined();
  });

  it("me returns user", async () => {
    const out = await backend.me("Bearer x");
    expect(out.user).toEqual(user);
  });

  it("forgotPassword returns message and optional resetToken", async () => {
    const out = await backend.forgotPassword("e@e.com");
    expect(out.message).toBe("sent");
    expect(out.resetToken).toBe("dev-token");
  });

  it("resetPassword resolves", async () => {
    await expect(backend.resetPassword("t", "pw")).resolves.toBeUndefined();
  });

  it("getUser", async () => {
    await expect(backend.getUser("Bearer x", "1")).resolves.toEqual(user);
  });

  it("createUser with optional password", async () => {
    await expect(backend.createUser("Bearer x", "u", "e@e.com")).resolves.toEqual(user);
    await expect(
      backend.createUser("Bearer x", "u", "e@e.com", "secret"),
    ).resolves.toEqual(user);
    await expect(
      backend.createUser("Bearer x", "u", "e@e.com", undefined),
    ).resolves.toEqual(user);
  });

  it("listUsers", async () => {
    await expect(backend.listUsers("Bearer x")).resolves.toEqual([user]);
  });

  it("listUsers forwards trimmed query and role", async () => {
    let seen: unknown;
    const US = serviceCtor({
      GetUser(_req, _md, cb) {
        cb(null, user);
      },
      CreateUser(_req, _md, cb) {
        cb(null, user);
      },
      ListUsers(req, _md, cb) {
        seen = req;
        cb(null, { users: [user] });
      },
      UpdateUser(_req, _md, cb) {
        cb(null, user);
      },
      DeleteUser(_req, _md, cb) {
        cb(null, user);
      },
    });
    const b = buildGrpcBackend(US, AuthService, RoleService, "localhost:9");
    await b.listUsers("Bearer x", { query: "  jo  ", role: " admin " });
    expect(seen).toEqual({ query: "jo", role: "admin" });
  });

  it("listRoles forwards trimmed query", async () => {
    let seen: unknown;
    const RS = serviceCtor({
      ListRoles(req, _md, cb) {
        seen = req;
        cb(null, { roles: [{ id: "r1", name: "admin" }] });
      },
      CreateRole(_req, _md, cb) {
        cb(null, { id: "r2", name: "new" });
      },
      GetRole(_req, _md, cb) {
        cb(null, { id: "r1", name: "admin" });
      },
      UpdateRole(_req, _md, cb) {
        cb(null, { id: "r1", name: "updated" });
      },
      DeleteRole(_req, _md, cb) {
        cb(null, { id: "r1", name: "admin" });
      },
      AssignUserRole(_req, _md, cb) {
        cb(null, {});
      },
      RemoveUserRole(_req, _md, cb) {
        cb(null, {});
      },
    });
    const b = buildGrpcBackend(UserService, AuthService, RS, "localhost:9");
    await b.listRoles("Bearer x", { query: "  adm  " });
    expect(seen).toEqual({ query: "adm" });
  });

  it("updateUser with partial patch", async () => {
    await expect(
      backend.updateUser("Bearer x", "1", { username: "n" }),
    ).resolves.toEqual(user);
    await expect(
      backend.updateUser("Bearer x", "1", { email: "x@x.com" }),
    ).resolves.toEqual(user);
    await expect(
      backend.updateUser("Bearer x", "1", { password: "newpw" }),
    ).resolves.toEqual(user);
  });

  it("deleteUser", async () => {
    await expect(backend.deleteUser("Bearer x", "1")).resolves.toEqual(user);
  });

  it("role CRUD and assign/remove", async () => {
    await expect(backend.listRoles("Bearer x")).resolves.toEqual([
      { id: "r1", name: "admin" },
    ]);
    await expect(backend.createRole("Bearer x", "x")).resolves.toEqual({
      id: "r2",
      name: "new",
    });
    await expect(backend.getRole("Bearer x", "r1")).resolves.toEqual({
      id: "r1",
      name: "admin",
    });
    await expect(backend.updateRole("Bearer x", "r1", "n")).resolves.toEqual({
      id: "r1",
      name: "updated",
    });
    await expect(backend.deleteRole("Bearer x", "r1")).resolves.toEqual({
      id: "r1",
      name: "admin",
    });
    await expect(
      backend.assignUserRole("Bearer x", "u1", "r1"),
    ).resolves.toBeUndefined();
    await expect(
      backend.removeUserRole("Bearer x", "u1", "r1"),
    ).resolves.toBeUndefined();
  });

  it("propagates gRPC errors from unary calls", async () => {
    const err = Object.assign(new Error("nope"), {
      code: grpc.status.UNAVAILABLE,
    }) as grpc.ServiceError;
    const BadUser = serviceCtor({
      GetUser(_req, _md, cb) {
        cb(err);
      },
    });
    const b = buildGrpcBackend(BadUser, AuthService, RoleService, "localhost:9");
    await expect(b.getUser(undefined, "1")).rejects.toBe(err);
  });

  it("userFromGrpc treats non-array roles as empty", async () => {
    const fullUser = {
      GetUser(_req: unknown, _md: grpc.Metadata, cb: GrpcCB) {
        cb(null, { ...user, roles: "x" as unknown as string[] });
      },
      CreateUser(_req: unknown, _md: grpc.Metadata, cb: GrpcCB) {
        cb(null, user);
      },
      ListUsers(_req: unknown, _md: grpc.Metadata, cb: GrpcCB) {
        cb(null, { users: [user] });
      },
      UpdateUser(_req: unknown, _md: grpc.Metadata, cb: GrpcCB) {
        cb(null, user);
      },
      DeleteUser(_req: unknown, _md: grpc.Metadata, cb: GrpcCB) {
        cb(null, user);
      },
    };
    const US = serviceCtor(fullUser);
    const b = buildGrpcBackend(US, AuthService, RoleService, "localhost:9");
    const u = await b.getUser("Bearer x", "1");
    expect(u.roles).toEqual([]);
  });

  it("listUsers uses empty array when users missing", async () => {
    const US = serviceCtor({
      GetUser(_req, _md, cb) {
        cb(null, user);
      },
      CreateUser(_req, _md, cb) {
        cb(null, user);
      },
      ListUsers(_req, _md, cb) {
        cb(null, {});
      },
      UpdateUser(_req, _md, cb) {
        cb(null, user);
      },
      DeleteUser(_req, _md, cb) {
        cb(null, user);
      },
    });
    const b = buildGrpcBackend(US, AuthService, RoleService, "localhost:9");
    await expect(b.listUsers("Bearer x")).resolves.toEqual([]);
  });

  it("listRoles maps missing id/name to empty strings", async () => {
    const RS = serviceCtor({
      ListRoles(_req, _md, cb) {
        cb(null, { roles: [{}] });
      },
      CreateRole(_req, _md, cb) {
        cb(null, { id: "r2", name: "new" });
      },
      GetRole(_req, _md, cb) {
        cb(null, {});
      },
      UpdateRole(_req, _md, cb) {
        cb(null, {});
      },
      DeleteRole(_req, _md, cb) {
        cb(null, {});
      },
      AssignUserRole(_req, _md, cb) {
        cb(null, {});
      },
      RemoveUserRole(_req, _md, cb) {
        cb(null, {});
      },
    });
    const b = buildGrpcBackend(UserService, AuthService, RS, "localhost:9");
    await expect(b.listRoles("Bearer x")).resolves.toEqual([{ id: "", name: "" }]);
    await expect(b.getRole("Bearer x", "r")).resolves.toEqual({ id: "", name: "" });
    await expect(b.updateRole("Bearer x", "r", "n")).resolves.toEqual({
      id: "",
      name: "",
    });
    await expect(b.deleteRole("Bearer x", "r")).resolves.toEqual({ id: "", name: "" });
  });

  it("login maps missing token fields to defaults", async () => {
    const AS = serviceCtor({
      Register(_req, _md, cb) {
        cb(null, { user });
      },
      Login(_req, _md, cb) {
        cb(null, { user });
      },
      Logout(_req, _md, cb) {
        cb(null, {});
      },
      Me(_req, _md, cb) {
        cb(null, { user });
      },
      ForgotPassword(_req, _md, cb) {
        cb(null, {});
      },
      ResetPassword(_req, _md, cb) {
        cb(null, {});
      },
    });
    const b = buildGrpcBackend(UserService, AS, RoleService, "localhost:9");
    const out = await b.login("u", "p");
    expect(out.accessToken).toBe("");
    expect(out.refreshToken).toBe("");
    expect(out.expiresInSeconds).toBe("0");
  });

  it("forgotPassword omits resetToken when absent", async () => {
    const AS = serviceCtor({
      Register(_req, _md, cb) {
        cb(null, { user });
      },
      Login(_req, _md, cb) {
        cb(null, {
          access_token: "a",
          refresh_token: "r",
          expires_in_seconds: 1,
          user,
        });
      },
      Logout(_req, _md, cb) {
        cb(null, {});
      },
      Me(_req, _md, cb) {
        cb(null, { user });
      },
      ForgotPassword(_req, _md, cb) {
        cb(null, {});
      },
      ResetPassword(_req, _md, cb) {
        cb(null, {});
      },
    });
    const b = buildGrpcBackend(UserService, AS, RoleService, "localhost:9");
    const out = await b.forgotPassword("e@e.com");
    expect(out.message).toBe("");
    expect(out.resetToken).toBeUndefined();
  });

  it("promisifyMeta rejects when callback returns error", async () => {
    const US = serviceCtor({
      GetUser(_req, _md, cb) {
        cb(
          Object.assign(new Error("x"), {
            code: grpc.status.UNAVAILABLE,
          }) as grpc.ServiceError,
        );
      },
      CreateUser(_req, _md, cb) {
        cb(null, user);
      },
      ListUsers(_req, _md, cb) {
        cb(null, { users: [] });
      },
      UpdateUser(_req, _md, cb) {
        cb(null, user);
      },
      DeleteUser(_req, _md, cb) {
        cb(null, user);
      },
    });
    const b = buildGrpcBackend(US, AuthService, RoleService, "localhost:9");
    await expect(b.getUser("Bearer x", "1")).rejects.toMatchObject({
      code: grpc.status.UNAVAILABLE,
    });
  });

  it("promisify (no-metadata) rejects when callback returns error", async () => {
    const handlers = {
      Register(_req: unknown, _md: grpc.Metadata, cb: GrpcCB) {
        cb(
          Object.assign(new Error("fail"), {
            code: grpc.status.INVALID_ARGUMENT,
          }) as grpc.ServiceError,
        );
      },
      Login(_req: unknown, _md: grpc.Metadata, cb: GrpcCB) {
        cb(null, {
          access_token: "a",
          refresh_token: "r",
          expires_in_seconds: 1,
          user,
        });
      },
      Logout(_req: unknown, _md: grpc.Metadata, cb: GrpcCB) {
        cb(null, {});
      },
      Me(_req: unknown, _md: grpc.Metadata, cb: GrpcCB) {
        cb(null, { user });
      },
      ForgotPassword(_req: unknown, _md: grpc.Metadata, cb: GrpcCB) {
        cb(null, { message: "ok" });
      },
      ResetPassword(_req: unknown, _md: grpc.Metadata, cb: GrpcCB) {
        cb(null, {});
      },
    };
    const AuthErr = serviceCtor(handlers);
    const b = buildGrpcBackend(UserService, AuthErr, RoleService, "localhost:9");
    await expect(b.register("u", "e@e.com", "p")).rejects.toMatchObject({
      code: grpc.status.INVALID_ARGUMENT,
    });
  });
});

describe("buildGrpcBackendFromEnv", () => {
  const protoRoot = path.join(__dirname, "..", "..", "common", "protos");
  const prevRoot = process.env.USER_PROTO_ROOT;
  const prevHost = process.env.GRPC_HOST;
  const prevPort = process.env.GRPC_PORT;

  afterEach(() => {
    if (prevRoot === undefined) {
      delete process.env.USER_PROTO_ROOT;
    } else {
      process.env.USER_PROTO_ROOT = prevRoot;
    }
    if (prevHost === undefined) {
      delete process.env.GRPC_HOST;
    } else {
      process.env.GRPC_HOST = prevHost;
    }
    if (prevPort === undefined) {
      delete process.env.GRPC_PORT;
    } else {
      process.env.GRPC_PORT = prevPort;
    }
  });

  it("loads constructors from USER_PROTO_ROOT and exposes backend methods", () => {
    process.env.USER_PROTO_ROOT = protoRoot;
    process.env.GRPC_HOST = "127.0.0.1";
    process.env.GRPC_PORT = "50051";
    const b = buildGrpcBackendFromEnv();
    expect(typeof b.register).toBe("function");
    expect(typeof b.listUsers).toBe("function");
  });
});
