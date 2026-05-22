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
    datasheet:      { type: String, trim: true, default: "" },
    unitsPerPackage:{ type: Number, default: 1, min: 1 },
    images:         [{ url: String, publicId: String }],
    photo:          String,
  },
  { timestamps: true }
);

ItemSchema.index({ companyId: 1, name: "text", nameEn: "text", sku: "text", barcode: "text" });

module.exports = mongoose.model("Item", ItemSchema);
