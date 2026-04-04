import type { AuditLogRow } from "./app";

/** Subset of Mongoose lean() document fields used for API rows. */
export type LeanAuditDoc = {
  _id: unknown;
  path: string;
  method: string;
  createdAt?: Date | string;
  payload?: unknown;
  createdUserId?: string;
};

function createdAtToISO(createdAt: Date | string | undefined): string {
  if (createdAt instanceof Date && !Number.isNaN(createdAt.getTime())) {
    return createdAt.toISOString();
  }
  if (typeof createdAt === "string" && createdAt.length > 0) {
    const dt = new Date(createdAt);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString();
    }
  }
  return new Date(0).toISOString();
}

function normalizePayload(payload: unknown): Record<string, unknown> {
  if (
    payload != null &&
    typeof payload === "object" &&
    !Array.isArray(payload)
  ) {
    return payload as Record<string, unknown>;
  }
  return {};
}

/** Maps a Mongo audit document to the REST row shape; safe for missing/invalid dates. */
export function leanAuditDocToRow(d: LeanAuditDoc): AuditLogRow {
  return {
    id: String(d._id),
    path: d.path,
    method: d.method,
    createdAt: createdAtToISO(d.createdAt),
    payload: normalizePayload(d.payload),
    createdUserId: d.createdUserId,
  };
}
