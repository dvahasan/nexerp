const mongoose = require('mongoose');

const BomProductionSchema = new mongoose.Schema(
  {
    companyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    bomId:        { type: mongoose.Schema.Types.ObjectId, ref: 'BomTemplate', required: true },
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    projectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    qtyProduced:  { type: Number, required: true, min: 0.0001 },
    outputItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    componentsUsed: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
        qty:    { type: Number, required: true },
      }
    ],
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

BomProductionSchema.index({ companyId: 1, bomId: 1 });

module.exports = mongoose.model('BomProduction', BomProductionSchema);
