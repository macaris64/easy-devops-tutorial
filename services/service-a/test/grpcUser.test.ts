import * as grpc from "@grpc/grpc-js";
import {
  createCreateUserFn,
  defaultProtoPath,
} from "../src/grpcUser";

describe("grpcUser", () => {
  it("defaultProtoPath uses USER_PROTO_PATH when set", () => {
    const prev = process.env.USER_PROTO_PATH;
    process.env.USER_PROTO_PATH = "/tmp/custom.proto";
    expect(defaultProtoPath()).toBe("/tmp/custom.proto");
    if (prev === undefined) {
      delete process.env.USER_PROTO_PATH;
    } else {
      process.env.USER_PROTO_PATH = prev;
    }
  });

  it("defaultProtoPath returns a path ending with user.proto", () => {
    delete process.env.USER_PROTO_PATH;
    const p = defaultProtoPath();
    expect(p).toMatch(/user\.proto$/);
  });

  it("createCreateUserFn invokes CreateUser callback", async () => {
    function MockCtor(this: unknown, _addr: string, _cred: grpc.ChannelCredentials) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).CreateUser = (
        req: { username: string; email: string },
        cb: (err: grpc.ServiceError | null, res: unknown) => void
      ) => {
        cb(null, { id: "1", username: req.username, email: req.email });
      };
    }
    const fn = createCreateUserFn(
      MockCtor as unknown as grpc.ServiceClientConstructor,
      "localhost:9"
    );
    const u = await fn("alice", "a@b.com");
    expect(u).toEqual({ id: "1", username: "alice", email: "a@b.com" });
  });

  it("createCreateUserFn propagates gRPC errors", async () => {
    function MockCtor(this: unknown, _addr: string, _cred: grpc.ChannelCredentials) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).CreateUser = (
        _req: unknown,
        cb: (err: grpc.ServiceError | null, res: unknown) => void
      ) => {
        cb(Object.assign(new Error("fail"), { code: 3 }) as grpc.ServiceError, null);
      };
    }
    const fn = createCreateUserFn(
      MockCtor as unknown as grpc.ServiceClientConstructor,
      "localhost:9"
    );
    await expect(fn("a", "b@c.com")).rejects.toThrow("fail");
  });
});
