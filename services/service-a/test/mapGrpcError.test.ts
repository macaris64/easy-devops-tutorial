import * as grpc from "@grpc/grpc-js";
import { mapGrpcError } from "../src/app";

describe("mapGrpcError", () => {
  it("returns null for non-ServiceError", () => {
    expect(mapGrpcError(new Error("x"))).toBeNull();
    expect(mapGrpcError(null)).toBeNull();
  });

  it("maps INVALID_ARGUMENT", () => {
    const e = Object.assign(new Error("bad"), {
      code: grpc.status.INVALID_ARGUMENT,
    }) as grpc.ServiceError;
    expect(mapGrpcError(e)).toEqual({ status: 400, body: { error: "bad" } });
  });

  it("maps NOT_FOUND", () => {
    const e = Object.assign(new Error("nf"), {
      code: grpc.status.NOT_FOUND,
    }) as grpc.ServiceError;
    expect(mapGrpcError(e)).toEqual({ status: 404, body: { error: "nf" } });
  });

  it("maps UNAUTHENTICATED", () => {
    const e = Object.assign(new Error("auth"), {
      code: grpc.status.UNAUTHENTICATED,
    }) as grpc.ServiceError;
    expect(mapGrpcError(e)).toEqual({ status: 401, body: { error: "auth" } });
  });

  it("maps PERMISSION_DENIED", () => {
    const e = Object.assign(new Error("denied"), {
      code: grpc.status.PERMISSION_DENIED,
    }) as grpc.ServiceError;
    expect(mapGrpcError(e)).toEqual({ status: 403, body: { error: "denied" } });
  });

  it("maps ALREADY_EXISTS", () => {
    const e = Object.assign(new Error("dup"), {
      code: grpc.status.ALREADY_EXISTS,
    }) as grpc.ServiceError;
    expect(mapGrpcError(e)).toEqual({ status: 409, body: { error: "dup" } });
  });
});
