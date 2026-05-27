const mongoose = require("mongoose");

const ItemStockLocationSchema = new mongoose.Schema(
  {
    companyId:   { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    itemId:      { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", default: null },
    binId:       { type: mongoose.Schema.Types.ObjectId, ref: "Bin", default: null },
    
    qty:         { type: Number, default: 0 },
    reservedQty: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Ensure only one tracking document per item/warehouse/bin combination
ItemStockLocationSchema.index({ companyId: 1, itemId: 1, warehouseId: 1, binId: 1 }, { unique: true });
ItemStockLocationSchema.index({ companyId: 1, itemId: 1 });
ItemStockLocationSchema.index({ companyId: 1, warehouseId: 1 });

module.exports = mongoose.model("ItemStockLocation", ItemStockLocationSchema);
