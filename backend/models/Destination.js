const mongoose = require("mongoose");

const DestinationSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name:      { type: String, required: true },
    contact:   { type: String, default: "" },
    notes:     { type: String, default: "" },
    active:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Destination", DestinationSchema);
