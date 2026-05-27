const mongoose = require("mongoose");

const TxSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, trim: true }, // e.g. INV-20260527-001
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    type:      { type: String, enum: ["IN","OUT"], required: true },
    itemId:    { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    qty:       { type: Number, required: true, min: 1 },
    sourceId:  { type: mongoose.Schema.Types.ObjectId, ref: "Source" },
    destId:    { type: mongoose.Schema.Types.ObjectId, ref: "Destination" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    reasonId:  { type: mongoose.Schema.Types.ObjectId, ref: "Reason" },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName:  String,
    date:      { type: Date, default: Date.now },
    notes:     String,

    // ── Warehouse & bin ───────────────────────────────────────────────────
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", default: null },
    binId:       { type: mongoose.Schema.Types.ObjectId, ref: "Bin",       default: null },
    binCode:     { type: String, trim: true },   // denormalised for fast display

    // ── Costing ───────────────────────────────────────────────────────────
    unitCost:    { type: Number, default: 0, min: 0 },   // cost per unit at time of tx
    landedCost:  { type: Number, default: 0, min: 0 },   // total landed extras (shipping, duties)

    // ── Status & Reversals (Soft Cancel) ──────────────────────────────────
    status:       { type: String, enum: ["active", "cancelled"], default: "active" },
    cancelledAt:  { type: Date, default: null },
    cancelledBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    cancelReason: { type: String, default: "" },

    // ── External Integrations (POS / API) ─────────────────────────────────
    externalSystem:  { type: String, default: "" },
    externalOrderId: { type: String, default: "" },
    idempotencyKey:  { type: String, default: "" }
  },
  { timestamps: true }
);

TxSchema.index({ companyId: 1, date: -1 });
TxSchema.index({ companyId: 1, itemId: 1, date: -1 });
TxSchema.index({ companyId: 1, type: 1, date: -1 });
TxSchema.index({ companyId: 1, userId: 1, date: -1 });
TxSchema.index({ companyId: 1, idempotencyKey: 1 }); // Useful for external API uniqueness

module.exports = mongoose.model("Transaction", TxSchema);
