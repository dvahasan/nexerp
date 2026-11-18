const mongoose = require("mongoose");

const ActionLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Null if unauthenticated (e.g., login attempt)
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    action: { type: String, required: true }, // e.g. "POST /api/transactions"
    method: { type: String, required: true },
    path: { type: String, required: true },
    body: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    statusCode: { type: Number },
    durationMs: { type: Number }
  },
  { timestamps: true }
);

// TTL: MongoDB deletes entries older than the retention window, so the audit
// log (which holds IPs and request details) doesn't grow forever.
const RETENTION_DAYS = Number(process.env.ACTION_LOG_RETENTION_DAYS) || 90;
ActionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_DAYS * 86400 });
ActionLogSchema.index({ companyId: 1 });
ActionLogSchema.index({ userId: 1 });

module.exports = mongoose.model("ActionLog", ActionLogSchema);
