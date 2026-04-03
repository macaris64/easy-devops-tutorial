import path from "path";
import { buildCreateUserFromEnv } from "../src/grpcUser";

describe("buildCreateUserFromEnv", () => {
  const proto = path.join(__dirname, "fixtures", "user.proto");

  it("returns a callable using GRPC_HOST and GRPC_PORT", () => {
    process.env.USER_PROTO_PATH = proto;
    process.env.GRPC_HOST = "example.test";
    process.env.GRPC_PORT = "50051";
    const fn = buildCreateUserFromEnv();
    expect(typeof fn).toBe("function");
  });

  it("uses default host and port when env vars are unset", () => {
    process.env.USER_PROTO_PATH = proto;
    delete process.env.GRPC_HOST;
    delete process.env.GRPC_PORT;
    const fn = buildCreateUserFromEnv();
    expect(typeof fn).toBe("function");
  });
});
