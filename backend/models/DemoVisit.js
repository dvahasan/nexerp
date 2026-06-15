const mongoose = require("mongoose");

const DemoVisitSchema = new mongoose.Schema(
  {
    ip: { type: String, default: "" },
    location: { type: String, default: "Unknown" },
    country: { type: String, default: "" },
    city: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    type: { type: String, default: "standard" }, // e.g. "standard", "enterprise"
  },
  { timestamps: true }
);

module.exports = mongoose.model("DemoVisit", DemoVisitSchema);
