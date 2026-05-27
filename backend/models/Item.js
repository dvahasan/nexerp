const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema(
  {
    companyId:      { type: mongoose.Schema.Types.ObjectId, ref: "Company",    required: true },
    name:           { type: String, required: true },
    nameEn:         String,
    description:    String,
    deptId:         { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    catId:          { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    sku:            { type: String, trim: true },
    barcode:        { type: String, trim: true },
    price:          { type: Number, default: 0, min: 0 },
    qty:            { type: Number, default: 0, min: 0 },
    minThreshold:   { type: Number, default: 0 },
    type:           { type: String, enum: ["unit","box","pack","group","roll","bag","pallet"], default: "unit" },
    status:         { type: String, enum: ["active","inactive","discontinued"], default: "active" },
    active:         { type: Boolean, default: true },
    currency:       { type: String, trim: true },
    isFavorite:     { type: Boolean, default: false },
    serialCode:     { type: String, trim: true },
    updateCount:    { type: Number, default: 0 },
    publish:        { type: Boolean, default: true },
    deletedAt:      { type: Date, default: null },
    datasheet:      { type: String, trim: true, default: "" },
    unitsPerPackage:{ type: Number, default: 1, min: 1 },
    images:         [{ url: String, publicId: String }],
    photo:          String,
    attachments:    [{ url: String, publicId: String, name: String, size: Number }],
    attributes:     { type: Map, of: String, default: {} },
    customAttributes: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },

    // ── Warehouse & bin location ───────────────────────────────────────────
    warehouseId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
    binLocation:  { type: String, trim: true, default: '' },  // alphanumeric bin code

    // ── Costing ───────────────────────────────────────────────────────────
    costingMethod: { type: String, enum: ['fifo', 'avg'], default: 'avg' },
    avgCost:       { type: Number, default: 0, min: 0 },  // running moving-average cost

    // ── Warehouse dimensions (how much space item takes) ──────────────────
    palletQty:    { type: Number, default: 1, min: 1 },   // units per pallet
    stackHeight:  { type: Number, default: 1, min: 1 },   // max pallet stack height

    // ── Reorder automation ────────────────────────────────────────────────
    reorderPoint: { type: Number, default: 0, min: 0 },   // trigger reorder when qty ≤ this
    reorderQty:   { type: Number, default: 0, min: 0 },   // suggested purchase quantity

    // ── Reservations ──────────────────────────────────────────────────────
    reservedQty:  { type: Number, default: 0, min: 0 },   // soft allocated stock
  },
  { timestamps: true }
);

ItemSchema.index({ companyId: 1, name: "text", nameEn: "text", sku: "text", barcode: "text" });
ItemSchema.index({ companyId: 1, sku: 1 });
ItemSchema.index({ companyId: 1, barcode: 1 });
ItemSchema.index({ companyId: 1, status: 1 });
ItemSchema.index({ companyId: 1, qty: 1 });
ItemSchema.index({ companyId: 1, warehouseId: 1 });

module.exports = mongoose.model("Item", ItemSchema);
