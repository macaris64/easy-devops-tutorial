import mongoose from "mongoose";

export interface AuditLogDoc {
  path: string;
  method: string;
  payload: Record<string, unknown>;
  createdUserId?: string;
  createdAt: Date;
}

const auditLogSchema = new mongoose.Schema<AuditLogDoc>({
  path: { type: String, required: true },
  method: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  createdUserId: { type: String },
  createdAt: { type: Date, default: Date.now },
});

/** Returns the shared AuditLog model (registers schema on first use). */
export function getAuditLogModel(): mongoose.Model<AuditLogDoc> {
  if (mongoose.models.AuditLog) {
    return mongoose.models.AuditLog as mongoose.Model<AuditLogDoc>;
  }
  return mongoose.model<AuditLogDoc>("AuditLog", auditLogSchema);
}

export const AuditLog = getAuditLogModel();
