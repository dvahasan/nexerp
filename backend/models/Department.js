const mongoose = require("mongoose");

const DeptSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name:      { type: String, required: true },
    nameEn:    String,
    color:     { type: String, default: "#3b82f6" },
    active:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Department", DeptSchema);
