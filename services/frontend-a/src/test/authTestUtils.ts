import type { CreatedUser } from "@easy-devops/user-panel";
import { vi } from "vitest";

const ACCESS_KEY = "easy_devops_access_token";
const REFRESH_KEY = "easy_devops_refresh_token";

/** Shared admin fixture for integration-style page tests. */
export const testAdminUser: CreatedUser = {
  id: "1",
  username: "admin",
  email: "admin@example.com",
  roles: ["admin"],
};

export function primeSession(access = "test-access", refresh = "test-refresh"): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/**
 * Stubs `fetch` to satisfy AuthProvider bootstrap (`/auth/me`) and optional extra handlers.
 */
export function stubFetchWithMe(
  me: CreatedUser,
  extra?: (
    url: string,
    init?: RequestInit,
  ) => Response | undefined | Promise<Response | undefined>,
): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (extra) {
        const fromExtra = await extra(url, init);
        if (fromExtra !== undefined) {
          return fromExtra;
        }
      }
      if (url.includes("/auth/me")) {
        return {
          ok: true,
          json: () => Promise.resolve({ user: me }),
        } as Response;
      }
      return {
        ok: false,
        statusText: "unhandled",
        json: () => Promise.resolve({ error: `unhandled fetch: ${url}` }),
      } as Response;
    }),
  );
}

export function authTestCleanup(): void {
  clearSession();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
}

/** True for GET /.../users (collection), not GET /.../users/:id */
export function isUsersListGet(url: string, init?: RequestInit): boolean {
  const path = url.split("?")[0];
  const method = init?.method ?? "GET";
  if (method !== "GET") {
    return false;
  }
  return /\/users$/.test(path);
}
