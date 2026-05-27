const mongoose = require('mongoose');

/**
 * Bin Model
 * Represents an alphanumeric bin/slot within a warehouse.
 * Code format: <Zone><Aisle>-<Level>   e.g. "A1-01", "B3-02"
 * Supports guided walk-path and bin-level tracking.
 */
const BinSchema = new mongoose.Schema(
  {
    companyId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Company',   required: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },

    code:     { type: String, required: true, trim: true },  // "A1-01"
    zone:     { type: String, trim: true },                  // "A"
    aisle:    { type: String, trim: true },                  // "1"
    level:    { type: String, trim: true },                  // "01" (floor = 01)

    // Max pallets this bin can hold
    capacity: { type: Number, default: 1, min: 0 },

    active: { type: Boolean, default: true },
    notes:  { type: String, trim: true },
  },
  { timestamps: true }
);

BinSchema.index({ companyId: 1, warehouseId: 1, code: 1 });

module.exports = mongoose.model('Bin', BinSchema);
