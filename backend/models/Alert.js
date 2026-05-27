const mongoose = require("mongoose");

const AlertSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    type:      { type: String, enum: ["low_stock", "out_of_stock", "expiration", "warehouse_capacity", "system"], required: true },
    severity:  { type: String, enum: ["info", "warning", "critical"], default: "warning" },
    
    itemId:      { type: mongoose.Schema.Types.ObjectId, ref: "Item", default: null },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", default: null },
    
    message:   { type: String, required: true },
    status:    { type: String, enum: ["open", "acknowledged", "resolved"], default: "open" },
    
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

AlertSchema.index({ companyId: 1, status: 1, severity: 1 });
AlertSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model("Alert", AlertSchema);
