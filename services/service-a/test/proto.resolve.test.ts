import * as grpc from "@grpc/grpc-js";
import { resolveUserServiceFromRoot } from "../src/proto";

describe("resolveUserServiceFromRoot", () => {
  it("uses nested user.v1.UserService", () => {
    const Ctor = class {} as unknown as grpc.ServiceClientConstructor;
    const root = {
      user: { v1: { UserService: Ctor } },
    } as Record<string, unknown>;
    expect(resolveUserServiceFromRoot(root)).toBe(Ctor);
  });

  it("falls back to flat user.v1.UserService", () => {
    const Ctor = class {} as unknown as grpc.ServiceClientConstructor;
    const root = {
      "user.v1": { UserService: Ctor },
    } as Record<string, unknown>;
    expect(resolveUserServiceFromRoot(root)).toBe(Ctor);
  });
});
