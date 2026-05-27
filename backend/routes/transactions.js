const express  = require("express");
const mongoose = require("mongoose");
const { Transaction, Item, Ledger, ItemStockLocation } = require("../models");
const AlertService = require("../services/AlertService");
const { protect, need }     = require("../middleware/auth");
const { friendly, statusFor } = require("../errors");
const { broadcast } = require("../utils/broadcast");

const router = express.Router();

// ── GET /api/transactions ────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const { item, type, from, to, page, limit: rawLimit, user, search, status } = req.query;
    const canSeeAll = req.user.role === "owner" || req.user.role === "admin";

    let q = { companyId: req.user.companyId };
    if (status && status !== "all") q.status = status;
    if (!canSeeAll)            q.userId = req.user._id;
    else if (user)             q.userId = user;
    if (item)                  q.itemId = item;
    if (type && type !== "all") q.type  = type;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to)   q.date.$lte = new Date(to + "T23:59:59");
    }

    // ── Text search: item name/nameEn/SKU/barcode + source/dest/notes/user ──
    if (search && search.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const matchingItems = await Item.find(
        { companyId: req.user.companyId,
          $or: [{ name: re }, { nameEn: re }, { sku: re }, { barcode: re }] },
        "_id"
      ).lean();
      const ids = matchingItems.map(i => i._id);
      q.$or = [
        { source:   re },
        { dest:     re },
        { notes:    re },
        { userName: re },
        ...(ids.length ? [{ itemId: { $in: ids } }] : []),
      ];
    }

    const pg    = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(rawLimit) || 20);
    const skip  = (pg - 1) * limit;

    const [txs, total] = await Promise.all([
      Transaction.find(q)
        .populate("itemId", "name nameEn sku barcode")
        .populate("sourceId", "name contact")
        .populate("destId", "name contact")
        .populate("projectId", "name")
        .populate("reasonId", "name")
        .populate("userId", "name phone")
        .sort({ date: -1 })
        .skip(skip).limit(limit),
      Transaction.countDocuments(q),
    ]);
    res.json({ txs, total, page: pg, pages: Math.ceil(total / limit) });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── GET /api/transactions/invoice/:invoiceNo ─────────────────────────────────
router.get("/invoice/:invoiceNo", protect, async (req, res) => {
  try {
    const txs = await Transaction.find({
      companyId: req.user.companyId,
      invoiceNo: req.params.invoiceNo
    })
      .populate("itemId", "name nameEn sku barcode")
      .populate("sourceId", "name contact")
      .populate("destId", "name contact")
      .populate("projectId", "name")
      .populate("reasonId", "name")
      .populate("userId", "name phone")
      .sort({ date: -1 });
    res.json(txs);
  } catch (e) {
    res.status(statusFor(e)).json({ message: friendly(e) });
  }
});

// ── POST /api/transactions ───────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
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
    const { type, source, dest, date, notes, projectId, reasonId } = req.body;
    
    let itemsArr = req.body.items;
    if (!itemsArr || !Array.isArray(itemsArr)) {
      itemsArr = [{
        itemId: req.body.itemId,
        qty: req.body.qty,
        unitCost: req.body.unitCost,
        landedCost: req.body.landedCost,
        warehouseId: req.body.warehouseId,
        binId: req.body.binId,
        binCode: req.body.binCode
      }];
    }

    if (itemsArr.length === 0) throw new Error("No items provided");

    const invoiceNo = `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const txDocs = [];
    const ledgerDocs = [];
    const updatedItemsMap = {};

    for (const itemData of itemsArr) {
      const { itemId, qty: rawQty, unitCost, landedCost, warehouseId, binId, binCode } = itemData;
      const qty = Number(rawQty);
      if (qty <= 0) throw new Error("Quantity must be positive");

      // Read current state to determine prevQty
      const currentItem = await Item.findOne({ _id: itemId, companyId: req.user.companyId }).session(session);
      if (!currentItem) throw new Error(`Item not found: ${itemId}`);
      
      const prevQty = currentItem.qty;
      const qtyChange = type === "IN" ? qty : -qty;
      
      let updatedItem;
      if (type === "OUT") {
        updatedItem = await Item.findOneAndUpdate(
          { _id: itemId, companyId: req.user.companyId, qty: { $gte: qty } },
          { $inc: { qty: qtyChange } },
          { new: true, session }
        );
        if (!updatedItem) throw new Error(`Insufficient stock for ${currentItem.name} — available: ${prevQty}`);
      } else {
        // IN
        let updateOps = { $inc: { qty: qtyChange } };
        // Update moving-average cost on StockIn
        if (unitCost && unitCost > 0) {
          const totalCostBefore = (currentItem.avgCost || 0) * prevQty;
          const totalCostIn     = unitCost * qty;
          const newAvgCost = prevQty + qty > 0
            ? +((totalCostBefore + totalCostIn) / (prevQty + qty)).toFixed(4)
            : unitCost;
          updateOps.$set = { avgCost: newAvgCost };
        }
        if (warehouseId && !currentItem.warehouseId) {
          updateOps.$set = updateOps.$set || {};
          updateOps.$set.warehouseId = warehouseId;
        }

        updatedItem = await Item.findOneAndUpdate(
          { _id: itemId, companyId: req.user.companyId },
          updateOps,
          { new: true, session }
        );
      }

      updatedItemsMap[itemId] = updatedItem;

      // Update Location Tracking
      if (warehouseId) {
        await ItemStockLocation.findOneAndUpdate(
          { companyId: req.user.companyId, itemId, warehouseId: warehouseId || null, binId: binId || null },
          { $inc: { qty: qtyChange } },
          { upsert: true, new: true, session }
        );
      }

      const txDocId = new mongoose.Types.ObjectId();
      txDocs.push({
        _id: txDocId,
        companyId: req.user.companyId,
        invoiceNo,
        type, itemId, qty,
        sourceId:  type === "IN"  ? source : undefined,
        destId:    type === "OUT" ? dest   : undefined,
        projectId: projectId || undefined,
        reasonId:  reasonId || undefined,
        userId:    req.user._id,
        userName:  req.user.name,
        date:      date ? new Date(date) : new Date(),
        notes,
        ...(warehouseId ? { warehouseId } : {}),
        ...(binId       ? { binId }       : {}),
        ...(binCode     ? { binCode }     : {}),
        unitCost:    unitCost    ? Number(unitCost)    : 0,
        landedCost:  landedCost  ? Number(landedCost)  : 0,
      });

      ledgerDocs.push({
        companyId: req.user.companyId,
        itemId,
        transactionId: txDocId,
        type: type,
        qtyChange: qtyChange,
        qtyBefore: prevQty,
        qtyAfter: updatedItem.qty,
        warehouseId: warehouseId || null,
        binId: binId || null,
        sourceId: type === "IN" ? source : undefined,
        destId: type === "OUT" ? dest : undefined,
        projectId: projectId || undefined,
        reasonId: reasonId || undefined,
        userId: req.user._id,
        notes: notes || `Recorded ${type}`,
      });
    }

    const createdTxs = await Transaction.insertMany(txDocs, { session });
    await Ledger.insertMany(ledgerDocs, { session });

    // Check alerts for all modified items
    for (const [itemId, updatedItem] of Object.entries(updatedItemsMap)) {
      await AlertService.checkStockAndAlert(updatedItem, session);
    }

    const populatedTxs = await Transaction.find({ _id: { $in: createdTxs.map(t => t._id) } }).session(session)
      .populate("itemId", "name nameEn sku barcode")
      .populate("sourceId", "name contact")
      .populate("destId", "name contact")
      .populate("projectId", "name")
      .populate("reasonId", "name")
      .populate("userId", "name phone");

    await session.commitTransaction();
    
    // Broadcast events AFTER commit!
    populatedTxs.forEach(tx => {
      broadcast(req, "tx_added", tx);
    });
    for (const [itemId, updatedItem] of Object.entries(updatedItemsMap)) {
      broadcast(req, "item_updated", updatedItem);
    }

    res.status(201).json({ 
      transaction: populatedTxs[0], 
      transactions: populatedTxs,
      updatedQty: updatedItemsMap[itemsArr[0].itemId].qty
    });
  } catch (e) {
    await session.abortTransaction();
    res.status(statusFor(e)).json({ message: friendly(e) });
  } finally { session.endSession(); }
}

// ── PUT /api/transactions/:id (Soft Cancel or Edit) ──────────────────────────
router.put("/:id", protect, need("canManageUsers"), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, companyId: req.user.companyId }).session(session);
    if (!tx) throw new Error("Transaction not found");
    if (tx.status === "cancelled") throw new Error("Transaction is already cancelled");

    // SOFT CANCEL LOGIC
    if (req.body.status === "cancelled") {
      const item = await Item.findOne({ _id: tx.itemId, companyId: req.user.companyId }).session(session);
      if (!item) throw new Error("Item not found");

      const qtyChange = tx.type === "IN" ? -tx.qty : tx.qty;
      const prevQty = item.qty;

      // Reversal logic
      if (tx.type === "IN") {
        if (item.qty < tx.qty) throw new Error(`Cannot reverse IN transaction: insufficient stock to deduct ${tx.qty}`);
        await Item.findOneAndUpdate(
          { _id: item._id, companyId: req.user.companyId, qty: { $gte: tx.qty } },
          { $inc: { qty: qtyChange } },
          { session }
        );
      } else {
        await Item.findOneAndUpdate(
          { _id: item._id, companyId: req.user.companyId },
          { $inc: { qty: qtyChange } },
          { session }
        );
      }

      if (tx.warehouseId) {
        await ItemStockLocation.findOneAndUpdate(
          { companyId: req.user.companyId, itemId: item._id, warehouseId: tx.warehouseId || null, binId: tx.binId || null },
          { $inc: { qty: qtyChange } },
          { session }
        );
      }

      tx.status = "cancelled";
      tx.cancelledAt = new Date();
      tx.cancelledBy = req.user._id;
      tx.cancelReason = req.body.cancelReason || "Cancelled by admin";
      await tx.save({ session });

      await Ledger.create([{
        companyId: req.user.companyId,
        itemId: item._id,
        transactionId: tx._id,
        type: "CANCEL",
        qtyChange: qtyChange,
        qtyBefore: prevQty,
        qtyAfter: prevQty + qtyChange,
        warehouseId: tx.warehouseId || null,
        binId: tx.binId || null,
        userId: req.user._id,
        notes: `Reversed Tx ${tx.invoiceNo || tx._id}`,
      }], { session });

      const updatedItem = await Item.findById(item._id).session(session);
      await AlertService.checkStockAndAlert(updatedItem, session);
      await session.commitTransaction();

      broadcast(req, "tx_updated", tx);
      broadcast(req, "item_updated", updatedItem);

      return res.json({ transaction: tx, updatedQty: updatedItem.qty });
    }

    // REGULAR EDIT LOGIC (Updates metadata ONLY for simplicity safely, or handles complex reversals)
    // To be perfectly safe, we shouldn't allow changing item/qty on an active transaction without
    // cancelling it and creating a new one. But for backwards compatibility, we handle it:
    
    throw new Error("Direct editing of quantities is deprecated. Please cancel this transaction and record a new one.");

  } catch (e) {
    await session.abortTransaction();
    res.status(statusFor(e)).json({ message: friendly(e) });
  } finally { session.endSession(); }
});

// ── DELETE /api/transactions/:id ─────────────────────────────────────────────
router.delete("/:id", protect, need("canManageUsers"), async (req, res) => {
  // We prefer soft-cancel. If they really want to delete, we will soft-cancel instead.
  res.status(400).json({ message: "Hard deletion of transactions is disabled. Please use soft-cancel (PUT /api/transactions/:id with status: 'cancelled')." });
});

module.exports = router;
