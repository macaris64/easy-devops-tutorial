import { afterEach, describe, expect, it, vi } from "vitest";
import { createUser, fetchAuditLogs } from "./gateway";

describe("gateway", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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
    expect(rows[0].path).toBe("/");
  });

  it("fetchAuditLogs throws on non-array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );
    await expect(fetchAuditLogs()).rejects.toThrow("invalid audit log response");
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
});
