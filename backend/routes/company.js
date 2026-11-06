const express = require("express");
const { Company }               = require("../models");
const { protect, need }         = require("../middleware/auth");
const upload                    = require("../middleware/upload");
const { uploadToCloudinary }    = require("../config/cloudinary");
const { friendly, statusFor }   = require("../errors");

const router = express.Router();

// ── PUT /api/company ──────────────────────────────────────────────────────────
// Whitelisted: code/active/logo/stamp and any unknown fields are not settable here
// (logo & stamp have their own upload endpoints below).
const UPDATABLE = [
  "name", "description", "industry", "baseCurrency", "theme", "activeIconPack",
  "primaryColor", "skuConfig", "liveSync", "fastRefresh", "features",
  "googleMapsApiKey", "slogan", "phone", "email", "address", "printSettings", "apiKeys",
];

router.put("/", protect, need("canManageCompany"), async (req, res) => {
  try {
    const update = {};
    for (const k of UPDATABLE) if (req.body[k] !== undefined) update[k] = req.body[k];

    // Normalize API keys to the schema's subdocument shape; the Settings UI
    // historically sent plain strings.
    if (Array.isArray(update.apiKeys)) {
      update.apiKeys = update.apiKeys
        .map((k) =>
          typeof k === "string"
            ? { key: k, name: "" }
            : { key: k.key, name: k.name || "", createdAt: k.createdAt || new Date() }
        )
        .filter((k) => typeof k.key === "string" && k.key.length > 0);
    }

    const c = await Company.findByIdAndUpdate(req.user.companyId, update, {
      returnDocument: "after",
      runValidators: true,
    });
    res.json(c);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/company/logo ────────────────────────────────────────────────────
router.post("/logo", protect, need("canManageCompany"), upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) throw new Error("No file uploaded");

    const folder = req.user.isEnterprise
      ? `nexinv/${req.user.username}/${req.user.companyId}`
      : `nexinv/${req.user.companyId}`;

    const result = await uploadToCloudinary(req.file.buffer, folder);
    const c = await Company.findByIdAndUpdate(
      req.user.companyId,
      { logo: result.secure_url },
      { returnDocument: "after" }
    );
    res.json({ success: true, logo: c.logo });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/company/stamp ───────────────────────────────────────────────────
router.post("/stamp", protect, need("canManageCompany"), upload.single("stamp"), async (req, res) => {
  try {
    if (!req.file) throw new Error("No file uploaded");

    const folder = req.user.isEnterprise
      ? `nexinv/${req.user.username}/${req.user.companyId}`
      : `nexinv/${req.user.companyId}`;

    const result = await uploadToCloudinary(req.file.buffer, folder);
    const c = await Company.findByIdAndUpdate(
      req.user.companyId,
      { stamp: result.secure_url },
      { returnDocument: "after" }
    );
    res.json({ success: true, stamp: c.stamp });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
