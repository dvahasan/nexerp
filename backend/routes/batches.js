const express = require("express");
const { Batch } = require("../models");
const { protect } = require("../middleware/auth");
const { friendly, statusFor } = require("../errors");

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const daysToExpiry = (expiryDate) =>
  expiryDate == null ? null : Math.ceil((new Date(expiryDate) - Date.now()) / DAY_MS);

// ── GET /api/batches/expiring?days=30 ────────────────────────────────────────
// Company-wide report of batches with stock remaining that expire within the
// window (already-expired batches included). Admin/owner only.
router.get("/expiring", protect, async (req, res) => {
  try {
    if (!(req.user.role === "owner" || req.user.role === "admin"))
      return res.status(403).json({ message: "Admin access required" });

    const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 30));
    const horizon = new Date(Date.now() + days * DAY_MS);

    const batches = await Batch.find({
      companyId: req.user.companyId,
      qtyRemaining: { $gt: 0 },
      expiryDate: { $ne: null, $lte: horizon },
    })
      .populate("itemId", "name nameEn sku barcode")
      .populate("warehouseId", "name code")
      .sort({ expiryDate: 1 });

    const rows = batches.map((b) => ({
      ...b.toObject(),
      daysToExpiry: daysToExpiry(b.expiryDate),
    }));

    res.json({
      days,
      count: rows.length,
      totalQty: rows.reduce((s, b) => s + b.qtyRemaining, 0),
      batches: rows,
    });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
