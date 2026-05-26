const mongoose = require("mongoose");

const TxSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    type:      { type: String, enum: ["IN","OUT"], required: true },
    itemId:    { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    qty:       { type: Number, required: true, min: 1 },
    source:    String,
    dest:      String,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", TxSchema);
