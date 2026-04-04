import type {
  CreatedUser,
  RoleListFilters,
  RoleRecord,
  UserListFilters,
} from "@easy-devops/user-panel";
import type { LogEntry } from "@easy-devops/log-panel";
import { getAccessToken, getRefreshToken } from "../auth/authStorage";

function apiPrefix(): string {
  const v = import.meta.env.VITE_API_PREFIX;
  return typeof v === "string" && v.length > 0 ? v : "/api";
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return typeof body.error === "string" ? body.error : res.statusText;
  } catch {
    return res.statusText;
  }
}

function withAuthHeaders(base?: HeadersInit): Headers {
  const headers = new Headers(base);
  const t = getAccessToken();
  if (t) {
    headers.set("Authorization", `Bearer ${t}`);
  }
  return headers;
}

export async function login(
  username: string,
  password: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: CreatedUser;
}> {
  const res = await fetch(`${apiPrefix()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  const body = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
    expiresInSeconds?: number;
    user: CreatedUser;
  };
  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    user: body.user,
  };
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  const headers = withAuthHeaders({ "Content-Type": "application/json" });
  const res = await fetch(`${apiPrefix()}/auth/logout`, {
    method: "POST",
    headers,
    body: JSON.stringify({ refreshToken: refreshToken ?? "" }),
  });
  if (!res.ok && res.status !== 401) {
    throw new Error(await readErrorMessage(res));
  }
}

export async function fetchMe(): Promise<CreatedUser> {
  const res = await fetch(`${apiPrefix()}/auth/me`, {
    headers: withAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  const body = (await res.json()) as { user: CreatedUser };
  return body.user;
}

export async function fetchUser(id: string): Promise<CreatedUser> {
  const enc = encodeURIComponent(id);
  const res = await fetch(`${apiPrefix()}/users/${enc}`, {
    headers: withAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as CreatedUser;
}

export async function createUser(
  username: string,
  email: string,
  password?: string,
): Promise<CreatedUser> {
  const body: Record<string, string> = { username, email };
  if (password !== undefined && password.length > 0) {
    body.password = password;
  }
  const res = await fetch(`${apiPrefix()}/users`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as CreatedUser;
}

export async function listUsers(filters?: UserListFilters): Promise<CreatedUser[]> {
  const params = new URLSearchParams();
  if (filters?.query?.trim()) {
    params.set("q", filters.query.trim());
  }
  if (filters?.role?.trim()) {
    params.set("role", filters.role.trim());
  }
  const qs = params.toString();
  const url = qs ? `${apiPrefix()}/users?${qs}` : `${apiPrefix()}/users`;
  const res = await fetch(url, {
    headers: withAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("invalid users response");
  }
  return data as CreatedUser[];
}

export async function updateUser(
  id: string,
  patch: { username?: string; email?: string; password?: string },
): Promise<CreatedUser> {
  const enc = encodeURIComponent(id);
  const res = await fetch(`${apiPrefix()}/users/${enc}`, {
    method: "PATCH",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as CreatedUser;
}

export async function deleteUser(id: string): Promise<CreatedUser> {
  const enc = encodeURIComponent(id);
  const res = await fetch(`${apiPrefix()}/users/${enc}`, {
    method: "DELETE",
    headers: withAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as CreatedUser;
}

export async function listRoles(filters?: RoleListFilters): Promise<RoleRecord[]> {
  const params = new URLSearchParams();
  if (filters?.query?.trim()) {
    params.set("q", filters.query.trim());
  }
  const qs = params.toString();
  const url = qs ? `${apiPrefix()}/roles?${qs}` : `${apiPrefix()}/roles`;
  const res = await fetch(url, {
    headers: withAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("invalid roles response");
  }
  return data as RoleRecord[];
}

export async function createRole(name: string): Promise<RoleRecord> {
  const res = await fetch(`${apiPrefix()}/roles`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as RoleRecord;
}

export async function getRole(id: string): Promise<RoleRecord> {
  const enc = encodeURIComponent(id);
  const res = await fetch(`${apiPrefix()}/roles/${enc}`, {
    headers: withAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as RoleRecord;
}

export async function updateRole(id: string, name: string): Promise<RoleRecord> {
  const enc = encodeURIComponent(id);
  const res = await fetch(`${apiPrefix()}/roles/${enc}`, {
    method: "PATCH",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as RoleRecord;
}

export async function deleteRole(id: string): Promise<RoleRecord> {
  const enc = encodeURIComponent(id);
  const res = await fetch(`${apiPrefix()}/roles/${enc}`, {
    method: "DELETE",
    headers: withAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as RoleRecord;
}

export async function assignUserRole(userId: string, roleId: string): Promise<void> {
  const enc = encodeURIComponent(userId);
  const res = await fetch(`${apiPrefix()}/users/${enc}/roles`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ roleId }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
}

export async function removeUserRole(userId: string, roleId: string): Promise<void> {
  const uid = encodeURIComponent(userId);
  const rid = encodeURIComponent(roleId);
  const res = await fetch(`${apiPrefix()}/users/${uid}/roles/${rid}`, {
    method: "DELETE",
    headers: withAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
}

/** Optional query for `GET /audit-logs` (admin). */
export type AuditLogQuery = {
  path?: string;
  method?: string;
  q?: string;
  limit?: number;
};

export async function fetchAuditLogs(query?: AuditLogQuery): Promise<LogEntry[]> {
  const params = new URLSearchParams();
  if (query?.path?.trim()) {
    params.set("path", query.path.trim());
  }
  if (query?.method?.trim()) {
    params.set("method", query.method.trim());
  }
  if (query?.q?.trim()) {
    params.set("q", query.q.trim());
  }
  if (query?.limit != null && Number.isFinite(query.limit)) {
    params.set("limit", String(Math.floor(query.limit)));
  }
  const qs = params.toString();
  const url = qs ? `${apiPrefix()}/audit-logs?${qs}` : `${apiPrefix()}/audit-logs`;
  const res = await fetch(url, {
    headers: withAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("invalid audit log response");
  }
  return data as LogEntry[];
}
