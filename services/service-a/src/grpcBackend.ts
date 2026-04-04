import * as grpc from "@grpc/grpc-js";
import { defaultProtoRoot, loadGrpcServiceConstructors } from "./proto";

export type UserDTO = {
  id: string;
  username: string;
  email: string;
  roles: string[];
};

/** Optional filters for ListUsers gRPC (query string + role name). */
export type ListUsersFilters = {
  query?: string;
  role?: string;
};

/** Optional filter for ListRoles gRPC (name substring). */
export type ListRolesFilters = {
  query?: string;
};

function grpcAddressFromEnv(): string {
  const grpcHost = process.env.GRPC_HOST || "localhost";
  const grpcPort = process.env.GRPC_PORT || "50051";
  return `${grpcHost}:${grpcPort}`;
}

function meta(authHeader?: string): grpc.Metadata {
  const m = new grpc.Metadata();
  if (authHeader) {
    m.set("authorization", authHeader);
  }
  return m;
}

type GrpcCB<T> = (err: grpc.ServiceError | null, res: T) => void;

function promisify<T>(
  call: (m: grpc.Metadata, cb: GrpcCB<T>) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    call(new grpc.Metadata(), (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(res as T);
    });
  });
}

function promisifyMeta<T>(
  md: grpc.Metadata,
  call: (m: grpc.Metadata, cb: GrpcCB<T>) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    call(md, (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(res as T);
    });
  });
}

function userFromGrpc(u: unknown): UserDTO {
  const o = u as { id?: string; username?: string; email?: string; roles?: string[] };
  return {
    id: String(o.id ?? ""),
    username: String(o.username ?? ""),
    email: String(o.email ?? ""),
    roles: Array.isArray(o.roles) ? o.roles.map(String) : [],
  };
}

export interface GrpcBackend {
  register(username: string, email: string, password: string): Promise<{ user: UserDTO }>;
  login(username: string, password: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresInSeconds: string;
    user: UserDTO;
  }>;
  logout(authHeader: string | undefined, refreshToken: string): Promise<void>;
  me(authHeader: string | undefined): Promise<{ user: UserDTO }>;
  forgotPassword(email: string): Promise<{ message: string; resetToken?: string }>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  getUser(authHeader: string | undefined, id: string): Promise<UserDTO>;
  createUser(
    authHeader: string | undefined,
    username: string,
    email: string,
    password?: string,
  ): Promise<UserDTO>;
  listUsers(authHeader: string | undefined, filters?: ListUsersFilters): Promise<UserDTO[]>;
  updateUser(
    authHeader: string | undefined,
    id: string,
    patch: { username?: string; email?: string; password?: string },
  ): Promise<UserDTO>;
  deleteUser(authHeader: string | undefined, id: string): Promise<UserDTO>;
  listRoles(authHeader: string | undefined, filters?: ListRolesFilters): Promise<{ id: string; name: string }[]>;
  createRole(authHeader: string | undefined, name: string): Promise<{ id: string; name: string }>;
  getRole(authHeader: string | undefined, id: string): Promise<{ id: string; name: string }>;
  updateRole(
    authHeader: string | undefined,
    id: string,
    name: string,
  ): Promise<{ id: string; name: string }>;
  deleteRole(authHeader: string | undefined, id: string): Promise<{ id: string; name: string }>;
  assignUserRole(authHeader: string | undefined, userId: string, roleId: string): Promise<void>;
  removeUserRole(authHeader: string | undefined, userId: string, roleId: string): Promise<void>;
}

export function buildGrpcBackend(
  UserService: grpc.ServiceClientConstructor,
  AuthService: grpc.ServiceClientConstructor,
  RoleService: grpc.ServiceClientConstructor,
  grpcAddress: string,
): GrpcBackend {
  const userClient = new UserService(
    grpcAddress,
    grpc.credentials.createInsecure(),
  ) as unknown as Record<string, (req: unknown, md: grpc.Metadata | undefined, cb: GrpcCB<unknown>) => void>;
  const authClient = new AuthService(
    grpcAddress,
    grpc.credentials.createInsecure(),
  ) as unknown as Record<string, (req: unknown, md: grpc.Metadata | undefined, cb: GrpcCB<unknown>) => void>;
  const roleClient = new RoleService(
    grpcAddress,
    grpc.credentials.createInsecure(),
  ) as unknown as Record<string, (req: unknown, md: grpc.Metadata | undefined, cb: GrpcCB<unknown>) => void>;

  return {
    register(username, email, password) {
      return promisify((m, cb) =>
        authClient.Register({ username, email, password }, m, cb),
      ).then((r) => ({ user: userFromGrpc((r as { user?: unknown }).user) }));
    },
    login(username, password) {
      return promisify((m, cb) => authClient.Login({ username, password }, m, cb)).then((r) => {
        const o = r as {
          access_token?: string;
          refresh_token?: string;
          expires_in_seconds?: number | string;
          user?: unknown;
        };
        return {
          accessToken: String(o.access_token ?? ""),
          refreshToken: String(o.refresh_token ?? ""),
          expiresInSeconds: String(o.expires_in_seconds ?? "0"),
          user: userFromGrpc(o.user),
        };
      });
    },
    logout(authHeader, refreshToken) {
      return promisifyMeta(meta(authHeader), (m, cb) =>
        authClient.Logout({ refresh_token: refreshToken }, m, cb),
      ).then(() => undefined);
    },
    me(authHeader) {
      return promisifyMeta(meta(authHeader), (m, cb) => authClient.Me({}, m, cb)).then((r) => ({
        user: userFromGrpc((r as { user?: unknown }).user),
      }));
    },
    forgotPassword(email) {
      return promisify((m, cb) => authClient.ForgotPassword({ email }, m, cb)).then((r) => {
        const o = r as { message?: string; reset_token?: string };
        return {
          message: String(o.message ?? ""),
          resetToken: o.reset_token,
        };
      });
    },
    resetPassword(token, newPassword) {
      return promisify((m, cb) =>
        authClient.ResetPassword({ token, new_password: newPassword }, m, cb),
      ).then(() => undefined);
    },
    getUser(authHeader, id) {
      return promisifyMeta(meta(authHeader), (m, cb) => userClient.GetUser({ id }, m, cb)).then((r) =>
        userFromGrpc(r),
      );
    },
    createUser(authHeader, username, email, password) {
      const req: Record<string, unknown> = { username, email };
      if (password !== undefined) {
        req.password = password;
      }
      return promisifyMeta(meta(authHeader), (m, cb) => userClient.CreateUser(req, m, cb)).then((r) =>
        userFromGrpc(r),
      );
    },
    listUsers(authHeader, filters) {
      const req: Record<string, unknown> = {};
      if (filters?.query !== undefined && filters.query.trim() !== "") {
        req.query = filters.query.trim();
      }
      if (filters?.role !== undefined && filters.role.trim() !== "") {
        req.role = filters.role.trim();
      }
      return promisifyMeta(meta(authHeader), (m, cb) => userClient.ListUsers(req, m, cb)).then((r) => {
        const users = (r as { users?: unknown[] }).users ?? [];
        return users.map((u) => userFromGrpc(u));
      });
    },
    updateUser(authHeader, id, patch) {
      const req: Record<string, unknown> = { id };
      if (patch.username !== undefined) {
        req.username = patch.username;
      }
      if (patch.email !== undefined) {
        req.email = patch.email;
      }
      if (patch.password !== undefined) {
        req.password = patch.password;
      }
      return promisifyMeta(meta(authHeader), (m, cb) => userClient.UpdateUser(req, m, cb)).then((r) =>
        userFromGrpc(r),
      );
    },
    deleteUser(authHeader, id) {
      return promisifyMeta(meta(authHeader), (m, cb) => userClient.DeleteUser({ id }, m, cb)).then((r) =>
        userFromGrpc(r),
      );
    },
    listRoles(authHeader, filters) {
      const req: Record<string, unknown> = {};
      if (filters?.query !== undefined && filters.query.trim() !== "") {
        req.query = filters.query.trim();
      }
      return promisifyMeta(meta(authHeader), (m, cb) => roleClient.ListRoles(req, m, cb)).then((r) => {
        const roles = (r as { roles?: { id?: string; name?: string }[] }).roles ?? [];
        return roles.map((x) => ({ id: String(x.id ?? ""), name: String(x.name ?? "") }));
      });
    },
    createRole(authHeader, name) {
      return promisifyMeta(meta(authHeader), (m, cb) => roleClient.CreateRole({ name }, m, cb)).then(
        (r) => ({
          id: String((r as { id?: string }).id ?? ""),
          name: String((r as { name?: string }).name ?? ""),
        }),
      );
    },
    getRole(authHeader, id) {
      return promisifyMeta(meta(authHeader), (m, cb) => roleClient.GetRole({ id }, m, cb)).then((r) => ({
        id: String((r as { id?: string }).id ?? ""),
        name: String((r as { name?: string }).name ?? ""),
      }));
    },
    updateRole(authHeader, id, name) {
      return promisifyMeta(meta(authHeader), (m, cb) =>
        roleClient.UpdateRole({ id, name }, m, cb),
      ).then((r) => ({
        id: String((r as { id?: string }).id ?? ""),
        name: String((r as { name?: string }).name ?? ""),
      }));
    },
    deleteRole(authHeader, id) {
      return promisifyMeta(meta(authHeader), (m, cb) => roleClient.DeleteRole({ id }, m, cb)).then((r) => ({
        id: String((r as { id?: string }).id ?? ""),
        name: String((r as { name?: string }).name ?? ""),
      }));
    },
    assignUserRole(authHeader, userId, roleId) {
      return promisifyMeta(meta(authHeader), (m, cb) =>
        roleClient.AssignUserRole({ user_id: userId, role_id: roleId }, m, cb),
      ).then(() => undefined);
    },
    removeUserRole(authHeader, userId, roleId) {
      return promisifyMeta(meta(authHeader), (m, cb) =>
        roleClient.RemoveUserRole({ user_id: userId, role_id: roleId }, m, cb),
      ).then(() => undefined);
    },
  };
}

export function buildGrpcBackendFromEnv(): GrpcBackend {
  const root = defaultProtoRoot();
  const { UserService, AuthService, RoleService } = loadGrpcServiceConstructors(root);
  return buildGrpcBackend(UserService, AuthService, RoleService, grpcAddressFromEnv());
}
