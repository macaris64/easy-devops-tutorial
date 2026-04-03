import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

/**
 * Resolves UserService client constructor from a loaded package definition root.
 */
export function resolveUserServiceFromRoot(
  root: Record<string, unknown>
): grpc.ServiceClientConstructor {
  const user = root.user as Record<string, unknown> | undefined;
  const v1nested = user?.v1 as Record<string, unknown> | undefined;
  const flat = root["user.v1"] as Record<string, unknown> | undefined;
  const Ctor = (v1nested?.UserService ??
    flat?.UserService) as grpc.ServiceClientConstructor | undefined;
  if (!Ctor) {
    throw new Error(
      `user.v1.UserService not found in proto; keys: ${Object.keys(root).join(",")}`
    );
  }
  return Ctor;
}

/**
 * Loads the UserService client constructor from a .proto file path.
 */
export function loadUserServiceConstructor(
  protoPath: string
): grpc.ServiceClientConstructor {
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const protoDescriptor = grpc.loadPackageDefinition(
    packageDefinition
  ) as grpc.GrpcObject;
  const root = protoDescriptor as unknown as Record<string, unknown>;
  return resolveUserServiceFromRoot(root);
}
