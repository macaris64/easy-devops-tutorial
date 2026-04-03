import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";

const protoBasenames = [
  "user/v1/user.proto",
  "auth/v1/auth.proto",
  "role/v1/role.proto",
];

/**
 * Root directory containing user/, auth/, role/ proto subtrees (e.g. .../protos).
 */
export function defaultProtoRoot(): string {
  return (
    process.env.USER_PROTO_ROOT ||
    path.join(__dirname, "..", "protos")
  );
}

export function protoFilePaths(root: string): string[] {
  return protoBasenames.map((p) => path.join(root, p));
}

export interface LoadedGrpcServices {
  UserService: grpc.ServiceClientConstructor;
  AuthService: grpc.ServiceClientConstructor;
  RoleService: grpc.ServiceClientConstructor;
}

/**
 * Loads user.v1.UserService, auth.v1.AuthService, role.v1.RoleService client constructors.
 */
export function loadGrpcServiceConstructors(protoRoot: string): LoadedGrpcServices {
  const packageDefinition = protoLoader.loadSync(protoFilePaths(protoRoot), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [protoRoot],
  });
  const d = grpc.loadPackageDefinition(packageDefinition) as grpc.GrpcObject;
  const root = d as unknown as Record<string, unknown>;
  const userV1 = (root.user as Record<string, unknown> | undefined)?.v1 as
    | Record<string, unknown>
    | undefined;
  const authV1 = (root.auth as Record<string, unknown> | undefined)?.v1 as
    | Record<string, unknown>
    | undefined;
  const roleV1 = (root.role as Record<string, unknown> | undefined)?.v1 as
    | Record<string, unknown>
    | undefined;
  const flatUser = root["user.v1"] as Record<string, unknown> | undefined;
  const flatAuth = root["auth.v1"] as Record<string, unknown> | undefined;
  const flatRole = root["role.v1"] as Record<string, unknown> | undefined;

  const UserService = (userV1?.UserService ?? flatUser?.UserService) as
    | grpc.ServiceClientConstructor
    | undefined;
  const AuthService = (authV1?.AuthService ?? flatAuth?.AuthService) as
    | grpc.ServiceClientConstructor
    | undefined;
  const RoleService = (roleV1?.RoleService ?? flatRole?.RoleService) as
    | grpc.ServiceClientConstructor
    | undefined;

  if (!UserService || !AuthService || !RoleService) {
    throw new Error(
      `gRPC service(s) missing from proto load; keys: ${Object.keys(root).join(",")}`,
    );
  }
  return { UserService, AuthService, RoleService };
}

/** Loads a single .proto file (e.g. test fixtures); include dir is the file's directory. */
export function loadUserServiceConstructor(protoPath: string): grpc.ServiceClientConstructor {
  const includeDirs = [path.dirname(protoPath)];
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs,
  });
  const protoDescriptor = grpc.loadPackageDefinition(
    packageDefinition,
  ) as grpc.GrpcObject;
  const root = protoDescriptor as unknown as Record<string, unknown>;
  return resolveUserServiceFromRoot(root);
}

/** @deprecated use resolveUserServiceFromRoot */
export function resolveUserServiceFromRoot(
  root: Record<string, unknown>,
): grpc.ServiceClientConstructor {
  const user = root.user as Record<string, unknown> | undefined;
  const v1nested = user?.v1 as Record<string, unknown> | undefined;
  const flat = root["user.v1"] as Record<string, unknown> | undefined;
  const Ctor = (v1nested?.UserService ??
    flat?.UserService) as grpc.ServiceClientConstructor | undefined;
  if (!Ctor) {
    throw new Error(
      `user.v1.UserService not found in proto; keys: ${Object.keys(root).join(",")}`,
    );
  }
  return Ctor;
}
