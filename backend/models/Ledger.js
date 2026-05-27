const mongoose = require("mongoose");

const LedgerSchema = new mongoose.Schema(
  {
    companyId:     { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    itemId:        { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
    type:          { type: String, enum: ["IN", "OUT", "ADJUST", "RESERVE", "RELEASE", "CANCEL"], required: true },
    
    qtyChange:     { type: Number, required: true }, // positive or negative
    qtyBefore:     { type: Number, required: true },
    qtyAfter:      { type: Number, required: true },
    
    warehouseId:   { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", default: null },
    binId:         { type: mongoose.Schema.Types.ObjectId, ref: "Bin", default: null },
    
    sourceId:      { type: mongoose.Schema.Types.ObjectId, ref: "Source", default: null },
    destId:        { type: mongoose.Schema.Types.ObjectId, ref: "Destination", default: null },
    projectId:     { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    reasonId:      { type: mongoose.Schema.Types.ObjectId, ref: "Reason", default: null },
    
    userId:        { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    notes:         { type: String, default: "" },
  },
  { timestamps: true }
);

LedgerSchema.index({ companyId: 1, itemId: 1, createdAt: -1 });
LedgerSchema.index({ companyId: 1, warehouseId: 1, createdAt: -1 });
LedgerSchema.index({ companyId: 1, transactionId: 1 });

module.exports = mongoose.model("Ledger", LedgerSchema);
