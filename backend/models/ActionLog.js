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

ActionLogSchema.index({ createdAt: -1 });
ActionLogSchema.index({ companyId: 1 });
ActionLogSchema.index({ userId: 1 });

module.exports = mongoose.model("ActionLog", ActionLogSchema);
