import * as grpc from "@grpc/grpc-js";
import path from "path";
import { defaultProtoRoot, loadGrpcServiceConstructors } from "./proto";

export type CreatedUser = {
  id: string;
  username: string;
  email: string;
  roles?: string[];
};

/**
 * @deprecated use grpcBackend.buildGrpcBackend; kept for tests and legacy callers.
 */
function userClient(
  UserService: grpc.ServiceClientConstructor,
  grpcAddress: string,
) {
  return new UserService(
    grpcAddress,
    grpc.credentials.createInsecure(),
  ) as unknown as {
    CreateUser: (
      req: { username: string; email: string },
      md: grpc.Metadata,
      cb: (err: grpc.ServiceError | null, res: unknown) => void,
    ) => void;
    GetUser: (
      req: { id: string },
      md: grpc.Metadata,
      cb: (err: grpc.ServiceError | null, res: unknown) => void,
    ) => void;
  };
}

export function createCreateUserFn(
  UserService: grpc.ServiceClientConstructor,
  grpcAddress: string,
): (username: string, email: string) => Promise<CreatedUser> {
  const client = userClient(UserService, grpcAddress);
  return (username: string, email: string) =>
    new Promise<CreatedUser>((resolve, reject) => {
      client.CreateUser(
        { username, email },
        new grpc.Metadata(),
        (err, response) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(response as CreatedUser);
        },
      );
    });
}

export function createGetUserFn(
  UserService: grpc.ServiceClientConstructor,
  grpcAddress: string,
): (id: string) => Promise<CreatedUser> {
  const client = userClient(UserService, grpcAddress);
  return (id: string) =>
    new Promise<CreatedUser>((resolve, reject) => {
      client.GetUser({ id }, new grpc.Metadata(), (err, response) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(response as CreatedUser);
      });
    });
}

export function defaultProtoPath(): string {
  const env = process.env.USER_PROTO_PATH;
  if (typeof env === "string" && env.length > 0) {
    return env;
  }
  return path.join(defaultProtoRoot(), "user", "v1", "user.proto");
}

function grpcAddressFromEnv(): string {
  const grpcHost = process.env.GRPC_HOST || "localhost";
  const grpcPort = process.env.GRPC_PORT || "50051";
  return `${grpcHost}:${grpcPort}`;
}

export function buildCreateUserFromEnv(): (
  username: string,
  email: string,
) => Promise<CreatedUser> {
  const Ctor = loadGrpcServiceConstructors(defaultProtoRoot()).UserService;
  return createCreateUserFn(Ctor, grpcAddressFromEnv());
}

export function buildGetUserFromEnv(): (id: string) => Promise<CreatedUser> {
  const Ctor = loadGrpcServiceConstructors(defaultProtoRoot()).UserService;
  return createGetUserFn(Ctor, grpcAddressFromEnv());
}
