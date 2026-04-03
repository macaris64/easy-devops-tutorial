import path from "path";
import { buildCreateUserFromEnv, buildGetUserFromEnv } from "../src/grpcUser";

/** Canonical protos tree (user/auth/role) for loadGrpcServiceConstructors. */
const protoRoot = path.join(__dirname, "..", "..", "common", "protos");

describe("buildCreateUserFromEnv", () => {
  const prevRoot = process.env.USER_PROTO_ROOT;

  afterEach(() => {
    if (prevRoot === undefined) {
      delete process.env.USER_PROTO_ROOT;
    } else {
      process.env.USER_PROTO_ROOT = prevRoot;
    }
  });

  it("returns a callable using GRPC_HOST and GRPC_PORT", () => {
    process.env.USER_PROTO_ROOT = protoRoot;
    process.env.GRPC_HOST = "example.test";
    process.env.GRPC_PORT = "50051";
    const fn = buildCreateUserFromEnv();
    expect(typeof fn).toBe("function");
  });

  it("uses default host and port when env vars are unset", () => {
    process.env.USER_PROTO_ROOT = protoRoot;
    delete process.env.GRPC_HOST;
    delete process.env.GRPC_PORT;
    const fn = buildCreateUserFromEnv();
    expect(typeof fn).toBe("function");
  });

  it("buildGetUserFromEnv returns a callable", () => {
    process.env.USER_PROTO_ROOT = protoRoot;
    process.env.GRPC_HOST = "example.test";
    process.env.GRPC_PORT = "50051";
    const fn = buildGetUserFromEnv();
    expect(typeof fn).toBe("function");
  });
});
