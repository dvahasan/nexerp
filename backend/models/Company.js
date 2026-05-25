const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    code:           { type: String, required: true, unique: true, uppercase: true, trim: true },
    name:           { type: String, required: true },
    description:    { type: String, default: "" },
    industry:       { type: String, default: "" },
    baseCurrency:   { type: String, default: "USD" },
    theme:          { type: String, default: "light" },
    activeIconPack: { type: String, default: "material" },
    primaryColor:   { type: String, default: "#3b82f6" },
    logo:           { type: String, default: "" },
    active:         { type: Boolean, default: true },
    skuConfig:      { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", CompanySchema);
