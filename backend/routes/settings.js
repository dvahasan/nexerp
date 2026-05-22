const express = require("express");
const { Setting }             = require("../models");
const { protect, need }       = require("../middleware/auth");
const { friendly, statusFor } = require("../errors");

const router = express.Router();

// ── GET /api/settings ────────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const all = await Setting.find({ companyId: req.user.companyId });
    const obj = {};
    all.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── PUT /api/settings ────────────────────────────────────────────────────────
router.put("/", protect, need("canManageUsers"), async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await Setting.findOneAndUpdate(
        { companyId: req.user.companyId, key },
        { value },
        { upsert: true, returnDocument: "after" }
      );
    }
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
