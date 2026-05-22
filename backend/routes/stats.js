const express = require("express");
const { Item, Transaction }   = require("../models");
const { protect }             = require("../middleware/auth");
const { friendly, statusFor } = require("../errors");

const router = express.Router();

// ── GET /api/stats ────────────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const cid = req.user.companyId;
    const canSeeAll = req.user.role === "owner" || req.user.role === "admin";

    const txFilter = canSeeAll
      ? { companyId: cid }
      : { companyId: cid, userId: req.user._id };

    const [totalItems, lowStock, outOfStock, valAgg, todayTx, recentTx, totalTransactions] =
      await Promise.all([
        Item.countDocuments({ companyId: cid, status: "active" }),
        Item.countDocuments({ companyId: cid, qty: { $gt: 0 }, $expr: { $lte: ["$qty", "$minThreshold"] } }),
        Item.countDocuments({ companyId: cid, qty: 0, status: "active" }),
        Item.aggregate([
          { $match: { companyId: cid } },
          { $group: { _id: null, total: { $sum: { $multiply: ["$qty", "$price"] } } } },
        ]),
        Transaction.countDocuments({ ...txFilter, date: { $gte: today } }),
        Transaction.find(txFilter).populate("itemId", "name nameEn").sort({ date: -1 }).limit(8),
        Transaction.countDocuments({ companyId: cid }),
      ]);

    res.json({
      totalItems, lowStock, outOfStock,
      totalValue: valAgg[0]?.total || 0,
      todayTransactions: todayTx,
      recentTx,
      totalTransactions,
    });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
