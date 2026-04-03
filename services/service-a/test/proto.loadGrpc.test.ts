import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { loadGrpcServiceConstructors } from "../src/proto";

describe("loadGrpcServiceConstructors", () => {
  const loadSync = jest.spyOn(protoLoader, "loadSync");
  const loadPackageDefinition = jest.spyOn(grpc, "loadPackageDefinition");

  afterEach(() => {
    loadSync.mockRestore();
    loadPackageDefinition.mockRestore();
  });

  it("throws when package definition lacks expected services", () => {
    loadSync.mockReturnValue({} as ReturnType<typeof protoLoader.loadSync>);
    loadPackageDefinition.mockReturnValue({} as grpc.GrpcObject);
    expect(() => loadGrpcServiceConstructors("/tmp/ignored")).toThrow(
      /gRPC service\(s\) missing/,
    );
  });
});
