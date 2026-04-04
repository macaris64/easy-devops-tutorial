import { afterEach, describe, expect, it, vi } from "vitest";
import { authTestCleanup, primeSession } from "../test/authTestUtils";
import {
  assignUserRole,
  createUser,
  deleteUser,
  fetchAuditLogs,
  fetchMe,
  fetchUser,
  listRoles,
  listUsers,
  login,
  logout,
  removeUserRole,
  updateUser,
} from "./gateway";

describe("gateway", () => {
  afterEach(() => {
    authTestCleanup();
  });

  it("createUser returns JSON body on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "1",
            username: "a",
            email: "a@b.c",
          }),
      }),
    );
    const u = await createUser("a", "a@b.c");
    expect(u.id).toBe("1");
    expect(fetch).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("createUser throws message from JSON error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Bad",
        json: () => Promise.resolve({ error: "duplicate" }),
      }),
    );
    await expect(createUser("a", "b")).rejects.toThrow("duplicate");
  });

  it("createUser falls back to statusText when JSON missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Nope",
        json: () => {
          throw new Error("parse");
        },
      }),
    );
    await expect(createUser("a", "b")).rejects.toThrow("Nope");
  });

  it("fetchAuditLogs returns array", async () => {
    primeSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: "x",
              path: "/",
              method: "GET",
              createdAt: "t",
            },
          ]),
      }),
    );
    const rows = await fetchAuditLogs();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(expect.objectContaining({ path: "/" }));
    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(init?.headers).toBeInstanceOf(Headers);
    expect((init?.headers as Headers).get("Authorization")).toBe(
      "Bearer test-access",
    );
  });

  it("fetchAuditLogs adds query params", async () => {
    primeSession();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchMock);
    await fetchAuditLogs({ path: "/users", method: "GET", q: "needle", limit: 50 });
    const u = String(fetchMock.mock.calls[0]?.[0]);
    expect(u.startsWith("/api/audit-logs?")).toBe(true);
    expect(u).toContain("path=");
    expect(u).toContain("method=GET");
    expect(u).toContain("q=needle");
    expect(u).toContain("limit=50");
  });

  it("fetchAuditLogs floors limit and skips NaN", async () => {
    primeSession();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchMock);
    await fetchAuditLogs({ limit: 12.7 });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("limit=12");
    fetchMock.mockClear();
    await fetchAuditLogs({ limit: Number.NaN });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/audit-logs");
  });

  it("fetchAuditLogs throws on error response", async () => {
    primeSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Bad",
        json: () => Promise.resolve({ error: "denied" }),
      }),
    );
    await expect(fetchAuditLogs()).rejects.toThrow("denied");
  });

  it("fetchAuditLogs throws on non-array", async () => {
    primeSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );
    await expect(fetchAuditLogs()).rejects.toThrow("invalid audit log response");
  });

  it("assignUserRole POSTs encoded user id", async () => {
    primeSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      }),
    );
    await assignUserRole("u/1", "role-1");
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("/api/users/u%2F1/roles");
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ roleId: "role-1" }),
      }),
    );
  });

  it("removeUserRole DELETEs encoded path", async () => {
    primeSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      }),
    );
    await removeUserRole("u 1", "r/2");
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      "/api/users/u%201/roles/r%2F2",
    );
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("removeUserRole throws on error response", async () => {
    primeSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Bad",
        json: () => Promise.resolve({ error: "nope" }),
      }),
    );
    await expect(removeUserRole("u", "r")).rejects.toThrow("nope");
  });

  it("fetchUser GETs encoded id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "u1",
            username: "a",
            email: "a@b.c",
          }),
      }),
    );
    const u = await fetchUser("id/with spaces");
    expect(u.id).toBe("u1");
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      "/api/users/id%2Fwith%20spaces",
    );
    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(init?.headers).toBeInstanceOf(Headers);
  });

  it("fetchUser throws on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Not Found",
        json: () => Promise.resolve({ error: "user not found" }),
      }),
    );
    await expect(fetchUser("x")).rejects.toThrow("user not found");
  });

  it("fetchAuditLogs throws on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "err",
        json: () => Promise.resolve({ error: "fail" }),
      }),
    );
    await expect(fetchAuditLogs()).rejects.toThrow("fail");
  });

  it("createUser sends Authorization when access token is set", async () => {
    primeSession("my-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "1",
          username: "a",
          email: "a@b.c",
        }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await createUser("a", "a@b.c");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer my-token");
  });

  it("login POSTs credentials and returns tokens and user", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            accessToken: "at",
            refreshToken: "rt",
            user: { id: "1", username: "u", email: "u@u.com" },
          }),
      }),
    );
    const out = await login("u", "secret");
    expect(out.accessToken).toBe("at");
    expect(out.user.username).toBe("u");
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("login throws JSON error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Unauthorized",
        json: () => Promise.resolve({ error: "nope" }),
      }),
    );
    await expect(login("a", "b")).rejects.toThrow("nope");
  });

  it("fetchMe returns user from envelope", async () => {
    primeSession("tok");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "9", username: "me", email: "me@x.com", roles: ["user"] },
          }),
      }),
    );
    const u = await fetchMe();
    expect(u.id).toBe("9");
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer tok");
  });

  it("fetchMe throws on error response", async () => {
    primeSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "x",
        json: () => Promise.resolve({ error: "expired" }),
      }),
    );
    await expect(fetchMe()).rejects.toThrow("expired");
  });

  it("logout POSTs refresh token and tolerates 401", async () => {
    primeSession("a", "refresh-xyz");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      }),
    );
    await expect(logout()).resolves.toBeUndefined();
  });

  it("logout throws on non-401 error", async () => {
    primeSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "down" }),
      }),
    );
    await expect(logout()).rejects.toThrow("down");
  });

  it("listUsers returns array", async () => {
    primeSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([{ id: "1", username: "a", email: "a@b.c" }]),
      }),
    );
    const list = await listUsers();
    expect(list).toHaveLength(1);
  });

  it("listUsers adds q and role query params", async () => {
    primeSession();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchMock);
    await listUsers({ query: "a", role: "admin" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/users?q=a&role=admin");
  });

  it("listUsers adds only role when query blank", async () => {
    primeSession();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchMock);
    await listUsers({ query: "  ", role: "admin" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/users?role=admin");
  });

  it("listUsers skips all-blank filters", async () => {
    primeSession();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchMock);
    await listUsers({ query: "  ", role: "  " });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/users");
  });

  it("listRoles returns array", async () => {
    primeSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: "r1", name: "admin" }]),
      }),
    );
    const list = await listRoles();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("admin");
  });

  it("listRoles adds q query param", async () => {
    primeSession();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchMock);
    await listRoles({ query: "ed" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/roles?q=ed");
  });

  it("listRoles throws on non-array", async () => {
    primeSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );
    await expect(listRoles()).rejects.toThrow("invalid roles response");
  });

  it("listUsers throws on non-array", async () => {
    primeSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );
    await expect(listUsers()).rejects.toThrow("invalid users response");
  });

  it("updateUser PATCHes encoded id", async () => {
    primeSession();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ id: "1", username: "new", email: "a@b.c" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const u = await updateUser("a/b", { username: "new" });
    expect(u.username).toBe("new");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/users/a%2Fb");
  });

  it("deleteUser DELETEs encoded id", async () => {
    primeSession();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ id: "1", username: "x", email: "x@y.z" }),
      }),
    );
    const u = await deleteUser("x y");
    expect(u.id).toBe("1");
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("/api/users/x%20y");
  });
});
