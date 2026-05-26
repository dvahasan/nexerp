const express  = require("express");
const mongoose = require("mongoose");
const { Transaction, Item } = require("../models");
const { protect, need }     = require("../middleware/auth");
const { friendly, statusFor } = require("../errors");

const router = express.Router();

// ── GET /api/transactions ────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const { item, type, from, to, page, limit: rawLimit, user } = req.query;
    const canSeeAll = req.user.role === "owner" || req.user.role === "admin";

    let q = { companyId: req.user.companyId };
    if (!canSeeAll)       q.userId = req.user._id;
    else if (user)        q.userId = user;
    if (item)             q.itemId = item;
    if (type && type !== "all") q.type = type;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to)   q.date.$lte = new Date(to + "T23:59:59");
    }

    const pg    = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(rawLimit) || 20);
    const skip  = (pg - 1) * limit;

    const [txs, total] = await Promise.all([
      Transaction.find(q)
        .populate("itemId", "name nameEn sku")
        .sort({ date: -1 })
        .skip(skip).limit(limit),
      Transaction.countDocuments(q),
    ]);
    res.json({ txs, total, page: pg, pages: Math.ceil(total / limit) });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/transactions ───────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  // Check type-specific permission: canTxIn for IN, canTxOut for OUT
  const reqType = (req.body.type || '').toUpperCase();
  const requiredPerm = reqType === 'IN' ? 'canTxIn' : 'canTxOut';
  if (!req.perms?.[requiredPerm]) {
    return res.status(403).json({ message: `No ${requiredPerm} permission` });
  }
  return txCreateHandler(req, res);
});
async function txCreateHandler(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { type, itemId, qty, source, dest, date, notes } = req.body;

    const item = await Item.findOne({ _id: itemId, companyId: req.user.companyId }).session(session);
    if (!item) throw new Error("Item not found");
    if (type === "OUT" && item.qty < qty)
      throw new Error(`Insufficient stock — available: ${item.qty}`);

    item.qty = type === "IN" ? item.qty + qty : item.qty - qty;
    await item.save({ session });

    const [tx] = await Transaction.create([{
      companyId: req.user.companyId,
      type, itemId, qty,
      source: type === "IN"  ? source    : undefined,
      dest:   type === "OUT" ? dest      : undefined,
      userId:   req.user._id,
      userName: req.user.name,
      date: date ? new Date(date) : new Date(),
      notes,
    }], { session });

    await session.commitTransaction();
    res.status(201).json({ transaction: tx, updatedQty: item.qty });
  } catch (e) {
    await session.abortTransaction();
    res.status(statusFor(e)).json({ message: friendly(e) });
  } finally { session.endSession(); }
}

// ── PUT /api/transactions/:id ────────────────────────────────────────────────
router.put("/:id", protect, need("canManageUsers"), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, companyId: req.user.companyId }).session(session);
    if (!tx) throw new Error("Transaction not found");

    const item = await Item.findOne({ _id: tx.itemId, companyId: req.user.companyId }).session(session);
    if (!item) throw new Error("Item not found");

    // Reverse old effect
    if (tx.type === "IN") item.qty -= tx.qty;
    else                  item.qty += tx.qty;

    // Apply new effect
    const newQty  = req.body.qty  !== undefined ? +req.body.qty : tx.qty;
    const newType = req.body.type || tx.type;
    if (newType === "IN") {
      item.qty += newQty;
    } else {
      if (item.qty < newQty) throw new Error(`Insufficient stock — available: ${item.qty}`);
      item.qty -= newQty;
    }
    await item.save({ session });

    const updated = await Transaction.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      {
        qty:    newQty,
        type:   newType,
        source: req.body.source !== undefined ? req.body.source : tx.source,
        dest:   req.body.dest   !== undefined ? req.body.dest   : tx.dest,
        date:   req.body.date   ? new Date(req.body.date) : tx.date,
        notes:  req.body.notes  !== undefined ? req.body.notes  : tx.notes,
      },
      { returnDocument: "after", session }
    ).populate("itemId", "name nameEn sku");

    await session.commitTransaction();
    res.json({ transaction: updated, updatedQty: item.qty });
  } catch (e) {
    await session.abortTransaction();
    res.status(statusFor(e)).json({ message: friendly(e) });
  } finally { session.endSession(); }
});

// ── DELETE /api/transactions/:id ─────────────────────────────────────────────
router.delete("/:id", protect, need("canManageUsers"), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, companyId: req.user.companyId }).session(session);
    if (!tx) throw new Error("Transaction not found");

    const item = await Item.findOne({ _id: tx.itemId, companyId: req.user.companyId }).session(session);
    if (item) {
      item.qty = tx.type === "IN" ? Math.max(0, item.qty - tx.qty) : item.qty + tx.qty;
      await item.save({ session });
    }

    await Transaction.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId }).session(session);
    await session.commitTransaction();
    res.json({ success: true, updatedQty: item?.qty });
  } catch (e) {
    await session.abortTransaction();
    res.status(statusFor(e)).json({ message: friendly(e) });
  } finally { session.endSession(); }
});

module.exports = router;
