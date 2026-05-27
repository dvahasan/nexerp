const mongoose = require("mongoose");

const ReasonSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    type:      { type: String, enum: ["IN", "OUT", "BOTH"], required: true },
    name:      { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reason", ReasonSchema);
