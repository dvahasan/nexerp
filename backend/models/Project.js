const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name:      { type: String, required: true },
    status:    { type: String, enum: ["ACTIVE", "COMPLETED", "ON_HOLD"], default: "ACTIVE" },
    notes:     { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", ProjectSchema);
