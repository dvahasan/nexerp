const mongoose = require("mongoose");

const CatSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company",    required: true },
    name:      { type: String, required: true },
    nameEn:    String,
    deptId:    { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    parentId:  { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    path:      { type: String, default: null, index: true },
    active:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", CatSchema);
