const mongoose = require("mongoose");

const PoLineSchema = new mongoose.Schema(
  {
    itemId:      { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    orderedQty:  { type: Number, required: true, min: 1 },
    receivedQty: { type: Number, default: 0, min: 0 },
    unitCost:    { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const PurchaseOrderSchema = new mongoose.Schema(
  {
    companyId:    { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    poNo:         { type: String, required: true, trim: true }, // e.g. PO-MB3K2A-0042
    supplier:     { type: mongoose.Schema.Types.ObjectId, ref: "Source", required: true },
    status:       {
      type: String,
      enum: ["draft", "confirmed", "partially_received", "received", "cancelled"],
      default: "draft",
    },
    expectedDate: { type: Date, default: null },
    currency:     { type: String, trim: true, default: "" },
    notes:        { type: String, default: "" },
    lines:        {
      type: [PoLineSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, "At least one line is required"],
    },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ companyId: 1, createdAt: -1 });
PurchaseOrderSchema.index({ companyId: 1, status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ companyId: 1, supplier: 1, createdAt: -1 });
PurchaseOrderSchema.index({ companyId: 1, poNo: 1 }, { unique: true });

module.exports = mongoose.model("PurchaseOrder", PurchaseOrderSchema);
