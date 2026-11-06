const express = require("express");
const mongoose = require("mongoose");
const { Ledger, Item } = require("../models");
const { protect } = require("../middleware/auth");
const { friendly, statusFor } = require("../errors");

const router = express.Router();

// ── GET /api/ledger ───────────────────────────────────────────────────────────
// Paginated stock-movement history. Non-admins see only their own entries,
// mirroring the visibility rule on GET /api/transactions.
router.get("/", protect, async (req, res) => {
  try {
    const { item, warehouse, type, from, to, page, limit: rawLimit } = req.query;
    const canSeeAll = req.user.role === "owner" || req.user.role === "admin";

    const q = { companyId: req.user.companyId };
    if (!canSeeAll) q.userId = req.user._id;
    if (item)      q.itemId = item;
    if (warehouse) q.warehouseId = warehouse;
    if (type && type !== "all") q.type = type;
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to)   q.createdAt.$lte = new Date(to + "T23:59:59");
    }

    const pg    = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(rawLimit) || 25);
    const skip  = (pg - 1) * limit;

    const [entries, total] = await Promise.all([
      Ledger.find(q)
        .populate("itemId", "name nameEn sku barcode")
        .populate("warehouseId", "name code")
        .populate("userId", "name")
        .populate("transactionId", "invoiceNo status")
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit),
      Ledger.countDocuments(q),
    ]);
    res.json({ entries, total, page: pg, pages: Math.ceil(total / limit) });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── GET /api/ledger/item/:itemId ──────────────────────────────────────────────
// Full movement history for one item, plus the integrity check:
// sum(qtyChange) must equal the item's current qty (items start at 0).
router.get("/item/:itemId", protect, async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.itemId, companyId: req.user.companyId });
    if (!item) return res.status(404).json({ message: "Item not found" });

    const entries = await Ledger.find({ companyId: req.user.companyId, itemId: item._id })
      .populate("warehouseId", "name code")
      .populate("userId", "name")
      .populate("transactionId", "invoiceNo status")
      .sort({ createdAt: -1 })
      .limit(500);

    const ledgerSum = entries.reduce((acc, l) => acc + l.qtyChange, 0);
    res.json({
      item: { _id: item._id, name: item.name, nameEn: item.nameEn, sku: item.sku, qty: item.qty },
      entries,
      integrity: {
        ledgerSum,
        currentQty: item.qty,
        consistent: ledgerSum === item.qty,
      },
    });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── GET /api/ledger/integrity ─────────────────────────────────────────────────
// Company-wide reconciliation: items whose ledger sum disagrees with Item.qty.
// Admin/owner only — this is the "is my stock data trustworthy?" report.
router.get("/integrity", protect, async (req, res) => {
  try {
    if (!(req.user.role === "owner" || req.user.role === "admin"))
      return res.status(403).json({ message: "Admin access required" });

    const companyId = new mongoose.Types.ObjectId(String(req.user.companyId));
    const sums = await Ledger.aggregate([
      { $match: { companyId } },
      { $group: { _id: "$itemId", ledgerSum: { $sum: "$qtyChange" } } },
    ]);
    const sumMap = new Map(sums.map(s => [s._id.toString(), s.ledgerSum]));

    const items = await Item.find({ companyId, deletedAt: null }).select("name nameEn sku qty");
    const mismatches = [];
    for (const it of items) {
      const ledgerSum = sumMap.get(it._id.toString()) ?? 0;
      if (ledgerSum !== it.qty) {
        mismatches.push({
          itemId: it._id, name: it.name, nameEn: it.nameEn, sku: it.sku,
          currentQty: it.qty, ledgerSum, drift: it.qty - ledgerSum,
        });
      }
    }

    res.json({
      checkedItems: items.length,
      consistent: mismatches.length === 0,
      mismatches,
    });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
