import mongoose from "mongoose";
import type { AuditLogListQuery } from "./app";
import { createApp } from "./app";
import { AuditLog } from "./auditLog";
import type { LeanAuditDoc } from "./auditLogRow";
import { leanAuditDocToRow } from "./auditLogRow";
import { buildGrpcBackendFromEnv } from "./grpcBackend";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const mongoUri =
  process.env.MONGO_URI || "mongodb://localhost:27017/service_a";
const port = Number(process.env.PORT || 3000);
const grpcHost = process.env.GRPC_HOST || "localhost";
const grpcPort = process.env.GRPC_PORT || "50051";
const grpcAddress = `${grpcHost}:${grpcPort}`;

const grpc = buildGrpcBackendFromEnv();

const corsRaw = process.env.CORS_ORIGIN;
const corsOptions =
  corsRaw === "*" || corsRaw === undefined || corsRaw === ""
    ? { origin: true as const }
    : { origin: corsRaw.split(",").map((s) => s.trim()).filter(Boolean) };

const app = createApp(
  {
    grpc,
    saveAuditLog: async (entry) => {
      await AuditLog.create(entry);
    },
    listAuditLogs: async (query?: AuditLogListQuery) => {
      const filter: Record<string, unknown> = {};
      if (query?.path?.trim()) {
        filter.path = new RegExp(escapeRegExp(query.path.trim()), "i");
      }
      if (query?.method?.trim()) {
        filter.method = new RegExp(
          `^${escapeRegExp(query.method.trim())}$`,
          "i",
        );
      }
      const cap = Math.min(500, Math.max(1, query?.limit ?? 100));
      const needPayloadScan = Boolean(query?.q?.trim());
      const fetchLimit = needPayloadScan ? Math.min(cap * 5, 500) : cap;
      let docs = await AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean();
      if (needPayloadScan && query?.q?.trim()) {
        const needle = query.q.trim().toLowerCase();
        docs = docs.filter((d) => {
          const doc = d as LeanAuditDoc;
          const p = String(doc.path ?? "").toLowerCase();
          const m = String(doc.method ?? "").toLowerCase();
          const pay = JSON.stringify(doc.payload ?? {}).toLowerCase();
          const uid = String(doc.createdUserId ?? "").toLowerCase();
          return (
            p.includes(needle) ||
            m.includes(needle) ||
            pay.includes(needle) ||
            uid.includes(needle)
          );
        });
        docs = docs.slice(0, cap);
      }
      return docs.map((d) => leanAuditDocToRow(d as LeanAuditDoc));
    },
  },
  corsOptions,
);

async function main(): Promise<void> {
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected:", mongoUri);

  app.listen(port, "0.0.0.0", () => {
    console.log(`Service-A listening on :${port} gRPC target=${grpcAddress}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
