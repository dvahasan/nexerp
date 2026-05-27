const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    companyId:         { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    name:              { type: String, required: true },
    nameEn:            String,
    username:          { type: String, required: true, lowercase: true, trim: true },
    email:             { type: String, trim: true, lowercase: true, default: "" },
    phone:             { type: String, trim: true, default: "" },
    passwordHash:      { type: String, required: true },
    role:              { type: String, enum: ["owner","admin","manager","warehouse","viewer"], default: "viewer" },
    permissions:       { type: mongoose.Schema.Types.Mixed, default: null },
    preferredLanguage: { type: String, default: "en" },
    isEnterprise:      { type: Boolean, default: false },
    ownedCompanies:    [{ type: mongoose.Schema.Types.ObjectId, ref: "Company" }],
    active:            { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique username per company (compound); enterprise users (no companyId) excluded via partial filter
UserSchema.index(
  { companyId: 1, username: 1 },
  { unique: true, partialFilterExpression: { isEnterprise: { $ne: true } } }
);

UserSchema.methods.checkPass = function (p) {
  return bcrypt.compare(p, this.passwordHash);
};

module.exports = mongoose.model("User", UserSchema);
