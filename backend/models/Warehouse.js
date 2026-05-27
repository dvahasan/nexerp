const mongoose = require('mongoose');

/**
 * Warehouse Model
 * Represents a physical warehouse/storage location for a company.
 * Capacity is calculated using: Usable Area × Net Height = Total Usable Volume
 * The 85% rule: occupancy > 85% triggers a "honeycombing" alert.
 */
const WarehouseSchema = new mongoose.Schema(
  {
    companyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    code:         { type: String, required: true, trim: true },   // "WH-01"
    name:         { type: String, required: true, trim: true },
    nameEn:       { type: String, trim: true },
    location:     { type: String, trim: true },                   // "Dubai, UAE"
    
    // ── Location Details ──────────────────────────────────────────────────
    type:         { type: String, enum: ['PHYSICAL', 'VIRTUAL'], default: 'PHYSICAL' },
    latitude:     { type: Number },
    longitude:    { type: Number },
    mapLink:      { type: String, trim: true },

    // ── Dimensional data (all in meters) ──────────────────────────────────
    length:       { type: Number, default: 0, min: 0 },           // m
    width:        { type: Number, default: 0, min: 0 },           // m
    height:       { type: Number, default: 0, min: 0 },           // net height, m

    // ── Usability factor (default 85% — standard warehouse efficiency) ────
    usableAreaPct: { type: Number, default: 0.85, min: 0, max: 1 },

    // ── Pallet spec ───────────────────────────────────────────────────────
    palletFootprint: { type: Number, default: 0.96 },             // m² (euro-pallet standard)

    // ── Capacity unit for display ─────────────────────────────────────────
    capacityUnit: { type: String, enum: ['pallets', 'm3', 'units'], default: 'pallets' },

    // ── Status ────────────────────────────────────────────────────────────
    active:  { type: Boolean, default: true },
    notes:   { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Computed virtuals (no DB storage — calculated on read) ────────────────────

/** Usable floor area in m² */
WarehouseSchema.virtual('usableArea').get(function () {
  return +(this.length * this.width * this.usableAreaPct).toFixed(2);
});

/** Maximum pallets that fit on the usable floor */
WarehouseSchema.virtual('maxPallets').get(function () {
  if (!this.palletFootprint || this.palletFootprint <= 0) return 0;
  return Math.floor((this.length * this.width * this.usableAreaPct) / this.palletFootprint);
});

/** Total usable volume in m³ */
WarehouseSchema.virtual('totalVolume').get(function () {
  return +((this.length * this.width * this.usableAreaPct) * this.height).toFixed(2);
});

WarehouseSchema.index({ companyId: 1, code: 1 });

module.exports = mongoose.model('Warehouse', WarehouseSchema);
