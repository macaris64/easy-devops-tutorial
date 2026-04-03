import * as grpc from "@grpc/grpc-js";
import path from "path";
import { loadUserServiceConstructor } from "./proto";

export type CreatedUser = { id: string; username: string; email: string };

/**
 * Returns a CreateUser caller bound to a gRPC address.
 */
export function createCreateUserFn(
  UserService: grpc.ServiceClientConstructor,
  grpcAddress: string
): (username: string, email: string) => Promise<CreatedUser> {
  const client = new UserService(
    grpcAddress,
    grpc.credentials.createInsecure()
  ) as unknown as {
    CreateUser: (
      req: { username: string; email: string },
      cb: (err: grpc.ServiceError | null, res: unknown) => void
    ) => void;
  };

  return (username: string, email: string) =>
    new Promise<CreatedUser>((resolve, reject) => {
      client.CreateUser({ username, email }, (err, response) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(response as CreatedUser);
      });
    });
}

export function defaultProtoPath(): string {
  return (
    process.env.USER_PROTO_PATH ||
    path.join(__dirname, "..", "protos", "user", "v1", "user.proto")
  );
}

export function buildCreateUserFromEnv(): (
  username: string,
  email: string
) => Promise<CreatedUser> {
  const grpcHost = process.env.GRPC_HOST || "localhost";
  const grpcPort = process.env.GRPC_PORT || "50051";
  const Ctor = loadUserServiceConstructor(defaultProtoPath());
  return createCreateUserFn(Ctor, `${grpcHost}:${grpcPort}`);
}
