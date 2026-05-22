const express = require("express");
const { Transaction, Item }   = require("../models");
const { protect, need }       = require("../middleware/auth");
const { cloudinary }          = require("../config/cloudinary");
const { friendly, statusFor } = require("../errors");

const router = express.Router();

// ── GET /api/admin/cloudinary ────────────────────────────────────────────────
// Returns Cloudinary usage stats (owner/admin only via canManageUsers permission).
router.get("/cloudinary", protect, need("canManageUsers"), async (req, res) => {
  try {
    const usage = await cloudinary.api.usage();
    res.json(usage);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── GET /api/admin/migrate-txs ────────────────────────────────────────────────
// One-time migration: backfill companyId on transactions that are missing it.
// Idempotent — safe to call multiple times; only touches documents where companyId is null/missing.
router.get("/migrate-txs", protect, async (req, res) => {
  if (req.user.role !== "owner" && req.user.role !== "admin")
    return res.status(403).json({ message: "Owner/admin only" });

  try {
    const orphans = await Transaction.find({ companyId: { $exists: false } }).populate("itemId", "companyId");
    let fixed = 0, skipped = 0;

    for (const tx of orphans) {
      const cid = tx.itemId?.companyId;
      if (cid) { tx.companyId = cid; await tx.save(); fixed++; }
      else skipped++;
    }
    res.json({ message: `Migration done. Fixed: ${fixed}, skipped (no item): ${skipped}` });
  } catch (e) { res.status(500).json({ message: friendly(e) }); }
});

module.exports = router;
