const express = require("express");
const { Company }               = require("../models");
const { protect, need }         = require("../middleware/auth");
const upload                    = require("../middleware/upload");
const { uploadToCloudinary }    = require("../config/cloudinary");
const { friendly, statusFor }   = require("../errors");

const router = express.Router();

// ── PUT /api/company ──────────────────────────────────────────────────────────
router.put("/", protect, need("canManageCompany"), async (req, res) => {
  try {
    const c = await Company.findByIdAndUpdate(req.user.companyId, req.body, { returnDocument: "after" });
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
