import type { GrpcBackend } from "../src/grpcBackend";

export const defaultGrpcUser = {
  id: "id-1",
  username: "u",
  email: "e@e.com",
  roles: [] as string[],
};

export function createGrpcBackendMock(over: Partial<GrpcBackend> = {}): GrpcBackend {
  const g: GrpcBackend = {
    register: async () => ({ user: { ...defaultGrpcUser } }),
    login: async () => ({
      accessToken: "a",
      refreshToken: "r",
      expiresInSeconds: "3600",
      user: { ...defaultGrpcUser },
    }),
    logout: async () => {},
    me: async () => ({ user: { ...defaultGrpcUser } }),
    forgotPassword: async () => ({ message: "ok" }),
    resetPassword: async () => {},
    getUser: async (_h, id) => ({ ...defaultGrpcUser, id }),
    createUser: async (_h, u, e) => ({
      ...defaultGrpcUser,
      id: "id-1",
      username: u,
      email: e,
    }),
    listUsers: async () => [{ ...defaultGrpcUser }],
    updateUser: async (_h, id) => ({ ...defaultGrpcUser, id }),
    deleteUser: async (_h, id) => ({ ...defaultGrpcUser, id }),
    listRoles: async () => [],
    createRole: async () => ({ id: "r", name: "role" }),
    getRole: async () => ({ id: "r", name: "role" }),
    updateRole: async () => ({ id: "r", name: "role" }),
    deleteRole: async () => ({ id: "r", name: "role" }),
    assignUserRole: async () => {},
    removeUserRole: async () => {},
  };
  return { ...g, ...over };
}
