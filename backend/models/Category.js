const mongoose = require("mongoose");

const CatSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company",    required: true },
    name:      { type: String, required: true },
    nameEn:    String,
    deptId:    { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    active:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", CatSchema);
