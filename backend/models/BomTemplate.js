const mongoose = require('mongoose');

/**
 * BOM (Bill of Materials) Template
 * Defines the multi-level recipe for producing an output item
 * from a set of component items (raw materials / sub-assemblies).
 */
const ComponentSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    qty:    { type: Number, required: true, min: 0.0001 },
    unit:   { type: String, default: 'unit', trim: true },
    notes:  { type: String, trim: true },
  },
  { _id: false }
);

const BomTemplateSchema = new mongoose.Schema(
  {
    companyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name:         { type: String, required: true, trim: true },
    nameEn:       { type: String, trim: true },

    // Output (produced) item
    outputItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    outputQty:    { type: Number, default: 1, min: 0.0001 },

    // Component / input items
    components:   [ComponentSchema],

    notes:  { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BomTemplateSchema.index({ companyId: 1 });

module.exports = mongoose.model('BomTemplate', BomTemplateSchema);
