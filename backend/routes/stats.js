const express = require("express");
const { Item, Transaction, Warehouse }   = require("../models");
const { protect }             = require("../middleware/auth");
const { friendly, statusFor } = require("../errors");

const router = express.Router();

// ── GET /api/stats ────────────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const today     = new Date(); today.setHours(0, 0, 0, 0);
    const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyAgo  = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const cid = req.user.companyId;
    const canSeeAll = req.user.role === "owner" || req.user.role === "admin";

    const txFilter = canSeeAll
      ? { companyId: cid }
      : { companyId: cid, userId: req.user._id };

    // ── Core stats (parallel) ─────────────────────────────────────────────
    const [
      totalItems, lowStock, outOfStock, valAgg, todayTx, recentTx,
      totalTransactions, stockoutItems, allItems,
      salesLast30, salesPrev30, reorderItems, warehouses,
    ] = await Promise.all([
      Item.countDocuments({ companyId: cid, status: "active", deletedAt: null }),
      Item.countDocuments({ companyId: cid, deletedAt: null, qty: { $gt: 0 }, $expr: { $lte: ["$qty", "$minThreshold"] } }),
      Item.countDocuments({ companyId: cid, deletedAt: null, qty: 0, status: "active" }),
      Item.aggregate([
        { $match: { companyId: cid, deletedAt: null } },
        { $group: { _id: null, total: { $sum: { $multiply: ["$qty", "$price"] } } } },
      ]),
      Transaction.countDocuments({ ...txFilter, date: { $gte: today } }),
      Transaction.find(txFilter)
        .populate("itemId", "name nameEn")
        .sort({ date: -1 }).limit(8),
      Transaction.countDocuments({ companyId: cid }),

      // Stockout rate: count active items with qty = 0
      Item.countDocuments({ companyId: cid, deletedAt: null, status: "active", qty: 0 }),

      // All active items for avg inventory
      Item.find({ companyId: cid, deletedAt: null, status: "active" }, "qty price avgCost costingMethod"),

      // COGS last 30 days (StockOut × unitCost or price)
      Transaction.aggregate([
        { $match: { companyId: cid, type: "OUT", date: { $gte: thirtyAgo } } },
        { $lookup: { from: "items", localField: "itemId", foreignField: "_id", as: "item" } },
        { $unwind: { path: "$item", preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: null,
          cogs: { $sum: { $multiply: [
            "$qty",
            { $cond: [{ $gt: ["$unitCost", 0] }, "$unitCost", { $ifNull: ["$item.avgCost", "$item.price"] }] },
          ]}},
        }},
      ]),

      // COGS prev 30 days (for trend)
      Transaction.aggregate([
        { $match: { companyId: cid, type: "OUT", date: { $gte: sixtyAgo, $lt: thirtyAgo } } },
        { $lookup: { from: "items", localField: "itemId", foreignField: "_id", as: "item" } },
        { $unwind: { path: "$item", preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: null,
          cogs: { $sum: { $multiply: [
            "$qty",
            { $cond: [{ $gt: ["$unitCost", 0] }, "$unitCost", { $ifNull: ["$item.avgCost", "$item.price"] }] },
          ]}},
        }},
      ]),

      // Items needing reorder
      Item.find({
        companyId: cid, deletedAt: null, status: "active",
        reorderPoint: { $gt: 0 },
        $expr: { $lte: ["$qty", "$reorderPoint"] },
      }, "name nameEn qty reorderPoint reorderQty warehouseId").limit(20),

      // Warehouse occupancy summary
      Warehouse.find({ companyId: cid, active: true }).limit(10),
    ]);

    // ── KPI calculations ──────────────────────────────────────────────────
    const totalValue  = valAgg[0]?.total || 0;
    const cogs30      = salesLast30[0]?.cogs || 0;
    const cogs30prev  = salesPrev30[0]?.cogs || 0;

    // Average inventory value (current snapshot × 30-day proxy)
    const avgInventoryValue = allItems.reduce((acc, item) => {
      const cost = item.avgCost > 0 ? item.avgCost : item.price;
      return acc + (item.qty * cost);
    }, 0);

    // Inventory Turnover (annualised from 30-day data)
    const dailyCogs      = cogs30 / 30;
    const annualCogs     = dailyCogs * 365;
    const inventoryTurnover = avgInventoryValue > 0 ? +(annualCogs / avgInventoryValue).toFixed(2) : 0;

    // Days Sales of Inventory
    const dsi = inventoryTurnover > 0 ? +(365 / inventoryTurnover).toFixed(1) : 0;

    // Stockout rate %
    const activeCount  = totalItems || 1;
    const stockoutRate = +((stockoutItems / activeCount) * 100).toFixed(1);

    // COGS trend vs prev period
    const cogsTrend = cogs30prev > 0
      ? +(((cogs30 - cogs30prev) / cogs30prev) * 100).toFixed(1)
      : 0;

    res.json({
      // Core
      totalItems, lowStock, outOfStock,
      totalValue,
      todayTransactions: todayTx,
      recentTx,
      totalTransactions,

      // KPIs
      inventoryTurnover,
      dsi,
      stockoutRate,
      cogs30: +cogs30.toFixed(2),
      cogsTrend,
      avgInventoryValue: +avgInventoryValue.toFixed(2),

      // Reorder alerts
      reorderAlerts: reorderItems,

      // Warehouse summary (occupancy computed separately per warehouse GET)
      warehouseCount: warehouses.length,
    });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
