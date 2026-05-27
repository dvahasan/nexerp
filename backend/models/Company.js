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
    liveSync:       { type: Boolean, default: true },
    fastRefresh:    { type: Boolean, default: true },
    features: {
      projects:     { type: Boolean, default: false },
      reasons:      { type: Boolean, default: false },
    },
    googleMapsApiKey: { type: String, default: "" },
    printSettings: {
      headerText: { type: String, default: "" },
      footerText: { type: String, default: "" },
      paperSize:  { type: String, enum: ['A4', 'A5', 'Letter', 'Legal'], default: 'A4' },
    },
    apiKeys: [
      {
        key: { type: String },
        name: { type: String },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", CompanySchema);
