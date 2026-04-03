import mongoose from "mongoose";
import { createApp } from "./app";
import { AuditLog } from "./auditLog";
import { buildCreateUserFromEnv } from "./grpcUser";

const mongoUri =
  process.env.MONGO_URI || "mongodb://localhost:27017/service_a";
const port = Number(process.env.PORT || 3000);
const grpcHost = process.env.GRPC_HOST || "localhost";
const grpcPort = process.env.GRPC_PORT || "50051";
const grpcAddress = `${grpcHost}:${grpcPort}`;

const createUser = buildCreateUserFromEnv();

const app = createApp({
  createUser,
  saveAuditLog: async (entry) => {
    await AuditLog.create(entry);
  },
});

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
