const mongoose = require("mongoose");

// One received lot/batch of a batch-tracked item. qtyRemaining is decremented
// FEFO (first-expired-first-out) by the transaction engine; batches are never
// deleted, they just reach qtyRemaining 0, so cancels can restore them.
const BatchSchema = new mongoose.Schema(
  {
    companyId:    { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    itemId:       { type: mongoose.Schema.Types.ObjectId, ref: "Item",    required: true },
    batchNo:      { type: String, required: true, trim: true },
    mfgDate:      { type: Date, default: null },
    expiryDate:   { type: Date, default: null },
    supplierLot:  { type: String, trim: true, default: "" },
    qtyRemaining: { type: Number, required: true, default: 0, min: 0 },

    warehouseId:  { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", default: null },
    binId:        { type: mongoose.Schema.Types.ObjectId, ref: "Bin",       default: null },
  },
  { timestamps: true }
);

// FEFO picking order and the expiring report both read this index.
BatchSchema.index({ companyId: 1, itemId: 1, expiryDate: 1 });
// One document per (item, batchNo) — repeated INs with the same batchNo increment it.
BatchSchema.index({ companyId: 1, itemId: 1, batchNo: 1 }, { unique: true });
BatchSchema.index({ companyId: 1, expiryDate: 1 });

module.exports = mongoose.model("Batch", BatchSchema);
