const express  = require("express");
const mongoose = require("mongoose");
const { PurchaseOrder, Source, Item, Transaction, Ledger, ItemStockLocation, Batch } = require("../models");
const AlertService = require("../services/AlertService");
const { receiveIntoBatch } = require("../services/batchStock");
const { protect, need } = require("../middleware/auth");
const { friendly, statusFor, httpError } = require("../errors");
const { broadcast } = require("../utils/broadcast");

const router = express.Router();

// Every procurement route needs canManagePurchases; receiving additionally
// requires canTxIn because it moves stock through the transaction engine.
router.use(protect, need("canManagePurchases"));

const genPoNo = () =>
  `PO-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

const POPULATE = [
  { path: "supplier", select: "name contact" },
  { path: "lines.itemId", select: "name nameEn sku barcode qty avgCost trackBatches" },
  { path: "createdBy", select: "name" },
];

// Validate supplier + line items belong to the caller's company and normalise lines.
async function validateBody(companyId, body, { session } = {}) {
  const { supplier, lines } = body;

  const src = await Source.findOne({ _id: supplier, companyId }).session(session || null);
  if (!src) throw httpError(404, "Supplier not found");

  if (!Array.isArray(lines) || lines.length === 0) throw httpError(400, "No lines provided");

  const cleanLines = [];
  for (const line of lines) {
    const orderedQty = Number(line.orderedQty);
    const unitCost   = Number(line.unitCost) || 0;
    if (!Number.isFinite(orderedQty) || orderedQty <= 0) throw httpError(400, "Ordered quantity must be positive");
    if (unitCost < 0) throw httpError(400, "Unit cost cannot be negative");

    const item = await Item.findOne({ _id: line.itemId, companyId }).session(session || null);
    if (!item) throw httpError(404, `Item not found: ${line.itemId}`);

    cleanLines.push({ itemId: item._id, orderedQty, unitCost, receivedQty: 0 });
  }
  return cleanLines;
}

// ── GET /api/purchase-orders — paginated list with status/supplier filters ──
router.get("/", async (req, res) => {
  try {
    const { status, supplier, page, limit: rawLimit } = req.query;
    const q = { companyId: req.user.companyId };
    if (status && status !== "all") q.status = status;
    if (supplier) q.supplier = supplier;

    const pg    = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(rawLimit) || 20);
    const skip  = (pg - 1) * limit;

    const [pos, total] = await Promise.all([
      PurchaseOrder.find(q).populate(POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PurchaseOrder.countDocuments(q),
    ]);
    res.json({ pos, total, page: pg, pages: Math.ceil(total / limit) });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── GET /api/purchase-orders/:id ─────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, companyId: req.user.companyId })
      .populate(POPULATE);
    if (!po) throw httpError(404, "Purchase order not found");
    res.json(po);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/purchase-orders — create draft ─────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const lines = await validateBody(req.user.companyId, req.body);
    const { supplier, expectedDate, currency, notes } = req.body;

    const po = await PurchaseOrder.create({
      companyId: req.user.companyId,
      poNo: genPoNo(),
      supplier,
      status: "draft",
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      currency: currency || "",
      notes: notes || "",
      lines,
      createdBy: req.user._id,
    });
    const populated = await PurchaseOrder.findById(po._id).populate(POPULATE);
    broadcast(req, "po_updated", populated);
    res.status(201).json(populated);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── PUT /api/purchase-orders/:id — update, drafts only ──────────────────────
router.put("/:id", async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!po) throw httpError(404, "Purchase order not found");
    if (po.status !== "draft") throw httpError(400, "Only draft purchase orders can be edited");

    if (req.body.supplier !== undefined || req.body.lines !== undefined) {
      const lines = await validateBody(req.user.companyId, {
        supplier: req.body.supplier ?? po.supplier,
        lines:    req.body.lines    ?? po.lines,
      });
      if (req.body.supplier !== undefined) po.supplier = req.body.supplier;
      if (req.body.lines !== undefined)    po.lines    = lines;
    }
    if (req.body.expectedDate !== undefined) po.expectedDate = req.body.expectedDate ? new Date(req.body.expectedDate) : null;
    if (req.body.currency !== undefined)     po.currency     = req.body.currency || "";
    if (req.body.notes !== undefined)        po.notes        = req.body.notes || "";

    await po.save();
    const populated = await PurchaseOrder.findById(po._id).populate(POPULATE);
    broadcast(req, "po_updated", populated);
    res.json(populated);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/purchase-orders/:id/confirm ────────────────────────────────────
router.post("/:id/confirm", async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!po) throw httpError(404, "Purchase order not found");
    if (po.status !== "draft") throw httpError(400, `Cannot confirm a ${po.status} purchase order`);

    po.status = "confirmed";
    await po.save();
    const populated = await PurchaseOrder.findById(po._id).populate(POPULATE);
    broadcast(req, "po_updated", populated);
    res.json(populated);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/purchase-orders/:id/cancel ─────────────────────────────────────
router.post("/:id/cancel", async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!po) throw httpError(404, "Purchase order not found");
    if (po.status === "cancelled") throw httpError(400, "Purchase order is already cancelled");
    if (po.status === "received")  throw httpError(400, "Cannot cancel a fully received purchase order");
    if (po.lines.some(l => l.receivedQty > 0))
      throw httpError(400, "Cannot cancel a purchase order with received goods");

    po.status = "cancelled";
    await po.save();
    const populated = await PurchaseOrder.findById(po._id).populate(POPULATE);
    broadcast(req, "po_updated", populated);
    res.json(populated);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/purchase-orders/:id/receive — goods receipt ────────────────────
// Body: { lines: [{ lineId, qty, warehouseId?, binId?,
//                  batchNo?, mfgDate?, expiryDate?, supplierLot? }], date?, notes? }
// Batch fields apply to batch-tracked items; without a batchNo the receipt
// becomes its own batch (named after the GRN number) so batch totals stay
// equal to Item.qty.
// Runs the same stock path as POST /api/transactions type IN: atomic Item
// update with moving-average cost, ItemStockLocation upsert, IN Transaction
// (invoiceNo GRN-…) and Ledger rows — all in one mongoose session.
router.post("/:id/receive", need("canTxIn"), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, companyId: req.user.companyId }).session(session);
    if (!po) throw httpError(404, "Purchase order not found");
    if (!["confirmed", "partially_received"].includes(po.status))
      throw httpError(400, `Cannot receive against a ${po.status} purchase order`);

    const recvLines = req.body.lines;
    if (!Array.isArray(recvLines) || recvLines.length === 0) throw httpError(400, "No lines provided");

    const invoiceNo = `GRN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
    const date = req.body.date ? new Date(req.body.date) : new Date();
    const txDocs = [];
    const ledgerDocs = [];
    const updatedItemsMap = {};

    for (const recv of recvLines) {
      const { lineId, warehouseId, binId, batchNo, mfgDate, expiryDate, supplierLot } = recv;
      const qty = Number(recv.qty);
      if (!Number.isFinite(qty) || qty <= 0) throw httpError(400, "Received quantity must be positive");

      const line = po.lines.id(lineId);
      if (!line) throw httpError(404, `Purchase order line not found: ${lineId}`);

      const remaining = line.orderedQty - line.receivedQty;
      if (qty > remaining)
        throw httpError(400, `Cannot receive ${qty} — only ${remaining} remaining on this line`);

      const currentItem = await Item.findOne({ _id: line.itemId, companyId: req.user.companyId, deletedAt: null }).session(session);
      if (!currentItem) throw httpError(404, `Item not found: ${line.itemId}`);

      const prevQty  = currentItem.qty;
      const unitCost = line.unitCost;

      // Same IN pattern as txCreateHandler: $inc qty + moving-average cost
      const updateOps = { $inc: { qty } };
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

      const updatedItem = await Item.findOneAndUpdate(
        { _id: line.itemId, companyId: req.user.companyId },
        updateOps,
        { new: true, session }
      );
      updatedItemsMap[line.itemId.toString()] = updatedItem;

      if (warehouseId) {
        await ItemStockLocation.findOneAndUpdate(
          { companyId: req.user.companyId, itemId: line.itemId, warehouseId: warehouseId || null, binId: binId || null },
          { $inc: { qty } },
          { upsert: true, new: true, session }
        );
      }

      const txBatches = [];
      if (currentItem.trackBatches) {
        txBatches.push(await receiveIntoBatch({
          companyId: req.user.companyId, itemId: line.itemId, qty,
          batchNo, fallbackBatchNo: invoiceNo,
          mfgDate, expiryDate, supplierLot, warehouseId, binId, session,
        }));
      }

      const txDocId = new mongoose.Types.ObjectId();
      txDocs.push({
        _id: txDocId,
        companyId: req.user.companyId,
        invoiceNo,
        type: "IN",
        itemId: line.itemId,
        qty,
        sourceId: po.supplier,
        userId: req.user._id,
        userName: req.user.name,
        date,
        notes: req.body.notes || `Goods receipt for ${po.poNo}`,
        ...(warehouseId ? { warehouseId } : {}),
        ...(binId ? { binId } : {}),
        unitCost: unitCost || 0,
        ...(txBatches.length ? { batches: txBatches } : {}),
      });

      ledgerDocs.push({
        companyId: req.user.companyId,
        itemId: line.itemId,
        transactionId: txDocId,
        type: "IN",
        qtyChange: qty,
        qtyBefore: prevQty,
        qtyAfter: updatedItem.qty,
        warehouseId: warehouseId || null,
        binId: binId || null,
        sourceId: po.supplier,
        userId: req.user._id,
        notes: req.body.notes || `Goods receipt for ${po.poNo}`,
        batchId: txBatches.length === 1 ? txBatches[0].batchId : null,
      });

      line.receivedQty += qty;
    }

    po.status = po.lines.every(l => l.receivedQty >= l.orderedQty) ? "received" : "partially_received";
    await po.save({ session });

    const createdTxs = await Transaction.insertMany(txDocs, { session });
    await Ledger.insertMany(ledgerDocs, { session });

    for (const updatedItem of Object.values(updatedItemsMap)) {
      await AlertService.checkStockAndAlert(updatedItem, session);
      if (updatedItem.trackBatches) {
        const itemBatches = await Batch.find({
          companyId: req.user.companyId, itemId: updatedItem._id, qtyRemaining: { $gt: 0 },
        }).session(session);
        await AlertService.checkExpiringBatchesAndAlert(updatedItem, itemBatches, session);
      }
    }

    const populatedTxs = await Transaction.find({ _id: { $in: createdTxs.map(t => t._id) } }).session(session)
      .populate("itemId", "name nameEn sku barcode")
      .populate("sourceId", "name contact")
      .populate("userId", "name phone");

    await session.commitTransaction();

    const populatedPo = await PurchaseOrder.findById(po._id).populate(POPULATE);

    // Broadcast events AFTER commit!
    broadcast(req, "po_updated", populatedPo);
    populatedTxs.forEach(tx => broadcast(req, "tx_added", tx));
    for (const updatedItem of Object.values(updatedItemsMap)) {
      broadcast(req, "item_updated", updatedItem);
    }

    res.status(201).json({ po: populatedPo, transactions: populatedTxs });
  } catch (e) {
    await session.abortTransaction();
    res.status(statusFor(e)).json({ message: friendly(e) });
  } finally { session.endSession(); }
});

module.exports = router;
