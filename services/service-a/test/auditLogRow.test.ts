import { leanAuditDocToRow } from "../src/auditLogRow";

describe("leanAuditDocToRow", () => {
  it("maps a normal document", () => {
    const row = leanAuditDocToRow({
      _id: "507f1f77bcf86cd799439011",
      path: "/auth/login",
      method: "POST",
      createdAt: new Date("2026-01-02T03:04:05.000Z"),
      payload: { kind: "auth", action: "login" },
      createdUserId: "u1",
    });
    expect(row.id).toBe("507f1f77bcf86cd799439011");
    expect(row.path).toBe("/auth/login");
    expect(row.method).toBe("POST");
    expect(row.createdAt).toBe("2026-01-02T03:04:05.000Z");
    expect(row.payload).toEqual({ kind: "auth", action: "login" });
    expect(row.createdUserId).toBe("u1");
  });

  it("uses epoch ISO when createdAt is missing", () => {
    const row = leanAuditDocToRow({
      _id: "x",
      path: "/p",
      method: "GET",
      payload: {},
    });
    expect(row.createdAt).toBe("1970-01-01T00:00:00.000Z");
  });

  it("uses epoch ISO when createdAt is invalid string", () => {
    const row = leanAuditDocToRow({
      _id: "x",
      path: "/p",
      method: "GET",
      createdAt: "not-a-date",
      payload: {},
    });
    expect(row.createdAt).toBe("1970-01-01T00:00:00.000Z");
  });

  it("coerces payload to empty object when null or non-object", () => {
    expect(
      leanAuditDocToRow({
        _id: "a",
        path: "/",
        method: "GET",
        payload: null,
      }).payload,
    ).toEqual({});
    expect(
      leanAuditDocToRow({
        _id: "b",
        path: "/",
        method: "GET",
        payload: [1, 2],
      }).payload,
    ).toEqual({});
  });
});
