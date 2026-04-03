import mongoose from "mongoose";
import {
  AuditLog,
  getAuditLogModel,
} from "../src/auditLog";

describe("AuditLog model", () => {
  it("is registered with Mongoose", () => {
    expect(AuditLog.modelName).toBe("AuditLog");
  });

  it("getAuditLogModel returns cached model when present", () => {
    const a = getAuditLogModel();
    const b = getAuditLogModel();
    expect(a).toBe(b);
  });

  it("registers model when not cached", async () => {
    delete mongoose.models.AuditLog;
    jest.resetModules();
    const { getAuditLogModel: getFresh } = await import("../src/auditLog");
    const m = getFresh();
    expect(m.modelName).toBe("AuditLog");
  });
});
