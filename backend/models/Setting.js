const mongoose = require("mongoose");

const SettingSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  key:       { type: String, required: true },
  value:     mongoose.Schema.Types.Mixed,
});

SettingSchema.index({ companyId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("Setting", SettingSchema);
