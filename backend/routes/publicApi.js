const express = require("express");
const mongoose = require("mongoose");
const { Company, Item, Transaction, Ledger, ItemStockLocation } = require("../models");
const AlertService = require("../services/AlertService");
const { broadcast } = require("../utils/broadcast");
const { friendly, statusFor } = require("../errors");

const router = express.Router();

/**
 * Middleware to authenticate requests using an API Key.
 * Expects header: x-api-key: "nex_..."
 */
async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) return res.status(401).json({ message: "API Key is required" });

  try {
    // Find company that owns this API key
    const company = await Company.findOne({ apiKeys: apiKey });
    if (!company) return res.status(403).json({ message: "Invalid API Key" });

    req.company = company;
    next();
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
}

// ── POST /api/public/checkout (External POS/E-commerce sync) ───────────
router.post("/checkout", authenticateApiKey, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { externalSystem, externalOrderId, idempotencyKey, items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("No items provided");
    }
    if (!idempotencyKey) {
      throw new Error("idempotencyKey is required for external operations");
    }

    const companyId = req.company._id;

    // Check idempotency key to prevent duplicate checkout logic
    const existingTx = await Transaction.findOne({ companyId, idempotencyKey }).session(session);
    if (existingTx) {
      // If we already processed this checkout, just return success
      await session.abortTransaction();
      return res.json({ message: "Already processed", invoiceNo: existingTx.invoiceNo });
    }

    const invoiceNo = `EXT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const txDocs = [];
    const ledgerDocs = [];
    const updatedItemsMap = {};

    for (const line of items) {
      const { sku, barcode, qty: rawQty, warehouseId, notes } = line;
      const qty = Number(rawQty);
      if (qty <= 0) throw new Error("Quantity must be positive");

      // Find item
      const query = { companyId };
      if (sku) query.sku = sku;
      else if (barcode) query.barcode = barcode;
      else throw new Error("Each item must have a sku or barcode");

      const item = await Item.findOne(query).session(session);
      if (!item) throw new Error(`Item not found for query: ${JSON.stringify(query)}`);
      
      const prevQty = item.qty;

      // Atomic OUT decrement
      const updatedItem = await Item.findOneAndUpdate(
        { _id: item._id, companyId, qty: { $gte: qty } },
        { $inc: { qty: -qty } },
        { new: true, session }
      );

      if (!updatedItem) throw new Error(`Insufficient stock for ${item.name} — available: ${prevQty}, requested: ${qty}`);

      updatedItemsMap[item._id] = updatedItem;

      if (warehouseId) {
        await ItemStockLocation.findOneAndUpdate(
          { companyId, itemId: item._id, warehouseId },
          { $inc: { qty: -qty } },
          { upsert: true, new: true, session }
        );
      }

      const txId = new mongoose.Types.ObjectId();
      txDocs.push({
        _id: txId,
        companyId,
        invoiceNo,
        type: "OUT",
        itemId: item._id,
        qty,
        userId: req.company.ownerId || null, // default to owner for external requests
        userName: externalSystem || "API Integration",
        notes: notes || `External checkout: ${externalOrderId || 'Unknown'}`,
        externalSystem,
        externalOrderId,
        idempotencyKey,
        ...(warehouseId ? { warehouseId } : {})
      });

      ledgerDocs.push({
        companyId,
        itemId: item._id,
        transactionId: txId,
        type: "OUT",
        qtyChange: -qty,
        qtyBefore: prevQty,
        qtyAfter: updatedItem.qty,
        warehouseId: warehouseId || null,
        userId: req.company.ownerId || null,
        notes: `External checkout: ${externalOrderId || 'Unknown'}`,
      });
    }

    const createdTxs = await Transaction.insertMany(txDocs, { session });
    await Ledger.insertMany(ledgerDocs, { session });

    for (const updatedItem of Object.values(updatedItemsMap)) {
      await AlertService.checkStockAndAlert(updatedItem, session);
    }

    const populatedTxs = await Transaction.find({ _id: { $in: createdTxs.map(t => t._id) } }).session(session)
      .populate("itemId", "name nameEn sku barcode");

    await session.commitTransaction();

    // Broadcast using a mock request object since we just need req.user.companyId
    const mockReq = { user: { companyId } };
    populatedTxs.forEach(tx => broadcast(mockReq, "tx_added", tx));
    for (const updatedItem of Object.values(updatedItemsMap)) {
      broadcast(mockReq, "item_updated", updatedItem);
    }

    res.status(201).json({ message: "Checkout processed successfully", invoiceNo, transactions: populatedTxs });

  } catch (e) {
    await session.abortTransaction();
    res.status(statusFor(e)).json({ message: friendly(e) });
  } finally {
    session.endSession();
  }
});

module.exports = router;
