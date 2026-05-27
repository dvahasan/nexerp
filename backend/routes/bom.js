const express   = require('express');
const mongoose  = require('mongoose');
const { BomTemplate, Item, Transaction, BomProduction } = require('../models');
const { protect, need }       = require('../middleware/auth');
const { friendly, statusFor } = require('../errors');
const { broadcast } = require('../utils/broadcast');

const router = express.Router();

// ── GET /api/bom ─────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const boms = await BomTemplate.find({ companyId: req.user.companyId })
      .populate('outputItemId', 'name nameEn sku qty')
      .populate('components.itemId', 'name nameEn sku qty')
      .sort({ createdAt: -1 });
    res.json(boms);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── GET /api/bom/:id ─────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const bom = await BomTemplate.findOne({ _id: req.params.id, companyId: req.user.companyId })
      .populate('outputItemId', 'name nameEn sku qty price')
      .populate('components.itemId', 'name nameEn sku qty price');
    if (!bom) return res.status(404).json({ message: 'BOM not found' });
    res.json(bom);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/bom ─────────────────────────────────────────────────────────────
router.post('/', protect, need('canAdd'), async (req, res) => {
  try {
    const doc = await BomTemplate.create({ ...req.body, companyId: req.user.companyId });
    const populated = await BomTemplate.findById(doc._id)
      .populate('outputItemId', 'name nameEn sku qty')
      .populate('components.itemId', 'name nameEn sku qty');
    broadcast(req, 'refresh_boms');
    res.status(201).json(populated);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── PUT /api/bom/:id ──────────────────────────────────────────────────────────
router.put('/:id', protect, need('canEdit'), async (req, res) => {
  try {
    const bom = await BomTemplate.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { returnDocument: 'after', runValidators: true, new: true }
    ).populate('outputItemId', 'name nameEn sku qty')
     .populate('components.itemId', 'name nameEn sku qty');
    if (!bom) return res.status(404).json({ message: 'BOM not found' });
    broadcast(req, 'refresh_boms');
    res.json(bom);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── DELETE /api/bom/:id ───────────────────────────────────────────────────────
router.delete('/:id', protect, need('canDelete'), async (req, res) => {
  try {
    await BomTemplate.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    broadcast(req, 'refresh_boms');
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── GET /api/bom/:id/production-history ──────────────────────────────────────
router.get('/:id/production-history', protect, async (req, res) => {
  try {
    const history = await BomProduction.find({ bomId: req.params.id, companyId: req.user.companyId })
      .populate('userId', 'name')
      .populate('projectId', 'name')
      .populate('outputItemId', 'name nameEn sku')
      .populate('componentsUsed.itemId', 'name nameEn')
      .sort({ createdAt: -1 });
    res.json(history);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

const { Ledger, ItemStockLocation } = require('../models');
const { getIO } = require('../utils/broadcast');
const AlertService = require('../services/AlertService');

// ── POST /api/bom/:id/produce ─────────────────────────────────────────────────
// Execute production: consume components (StockOut) → create output (StockIn).
// Body: { qty: number, warehouseId?, notes? }
router.post('/:id/produce', protect, need('canTxIn'), async (req, res) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();
  try {
    const { qty = 1, warehouseId, notes } = req.body;
    const runQty = Number(qty);
    if (!runQty || runQty <= 0) throw new Error('Production quantity must be > 0');

    const bom = await BomTemplate.findOne({ _id: req.params.id, companyId: req.user.companyId })
      .populate('outputItemId')
      .populate('components.itemId')
      .session(dbSession);
    if (!bom) throw new Error('BOM not found');

    const cid = req.user.companyId;
    const txDate = new Date();
    const txBase = { companyId: cid, userId: req.user._id, userName: req.user.name, date: txDate, notes: notes || `Production run — BOM: ${bom.name}` };

    const outTxs = [];
    const ledgers = [];

    // 1. Consume each component (StockOut)
    for (const comp of bom.components) {
      const needed = comp.qty * runQty;
      
      const itemUpdate = await Item.findOneAndUpdate(
        { _id: comp.itemId._id, companyId: cid, qty: { $gte: needed } },
        { $inc: { qty: -needed } },
        { new: true, session: dbSession }
      );
      
      if (!itemUpdate) {
        // Find current qty to give a good error message
        const currentItem = await Item.findOne({ _id: comp.itemId._id, companyId: cid }).session(dbSession);
        throw new Error(`Insufficient stock for "${currentItem?.name || currentItem?.nameEn}" — need ${needed}, have ${currentItem?.qty || 0}`);
      }

      // Update location stock if warehouse provided
      if (warehouseId) {
        await ItemStockLocation.findOneAndUpdate(
          { companyId: cid, itemId: itemUpdate._id, warehouseId, binId: null },
          { $inc: { qty: -needed } },
          { upsert: true, new: true, session: dbSession }
        );
      }

      const [tx] = await Transaction.create([{
        ...txBase, type: 'OUT', itemId: itemUpdate._id, qty: needed,
        dest: 'Production',
        unitCost: itemUpdate.avgCost || itemUpdate.price || 0,
        ...(warehouseId ? { warehouseId } : {}),
      }], { session: dbSession });
      outTxs.push(tx);

      ledgers.push({
        companyId: cid,
        itemId: itemUpdate._id,
        transactionId: tx._id,
        type: 'OUT',
        qtyChange: -needed,
        qtyBefore: itemUpdate.qty + needed,
        qtyAfter: itemUpdate.qty,
        warehouseId: warehouseId || undefined,
        destId: undefined, // Internal production
        userId: req.user._id,
        notes: txBase.notes
      });
    }

    // 2. Create output (StockIn)
    const outputQtyTotal = bom.outputQty * runQty;
    const outputItemUpdate = await Item.findOneAndUpdate(
      { _id: bom.outputItemId._id, companyId: cid },
      { $inc: { qty: outputQtyTotal } },
      { new: true, session: dbSession }
    );
    if (!outputItemUpdate) throw new Error('Output item not found');

    if (warehouseId) {
      await ItemStockLocation.findOneAndUpdate(
        { companyId: cid, itemId: outputItemUpdate._id, warehouseId, binId: null },
        { $inc: { qty: outputQtyTotal } },
        { upsert: true, new: true, session: dbSession }
      );
    }

    const [inTx] = await Transaction.create([{
      ...txBase, type: 'IN', itemId: outputItemUpdate._id, qty: outputQtyTotal,
      source: 'Production',
      unitCost: outputItemUpdate.avgCost || outputItemUpdate.price || 0,
      ...(warehouseId ? { warehouseId } : {}),
    }], { session: dbSession });

    ledgers.push({
      companyId: cid,
      itemId: outputItemUpdate._id,
      transactionId: inTx._id,
      type: 'IN',
      qtyChange: outputQtyTotal,
      qtyBefore: outputItemUpdate.qty - outputQtyTotal,
      qtyAfter: outputItemUpdate.qty,
      warehouseId: warehouseId || undefined,
      sourceId: undefined,
      userId: req.user._id,
      notes: txBase.notes
    });

    // Write all ledgers
    await Ledger.insertMany(ledgers, { session: dbSession });

    // 3. Log to BomProduction History
    const prodLog = await BomProduction.create([{
      companyId: cid,
      bomId: bom._id,
      userId: req.user._id,
      projectId: bom.projectId, // Inherit project from BOM if assigned
      qtyProduced: outputQtyTotal,
      outputItemId: outputItemUpdate._id,
      componentsUsed: bom.components.map(c => ({ itemId: c.itemId._id, qty: c.qty * runQty })),
      notes: notes
    }], { session: dbSession });

    await dbSession.commitTransaction();
    dbSession.endSession();
    
    // Broadcasts and Alerts
    const io = getIO();
    if (io) {
      const room = cid._id ? cid._id.toString() : cid.toString();
      io.to(room).emit('tx_added', inTx);
      io.to(room).emit('item_updated', outputItemUpdate);
      AlertService.checkStockAndAlert(outputItemUpdate).catch(console.error);
      
      for (const tx of outTxs) {
        io.to(room).emit('tx_added', tx);
      }
      
      // We need to re-fetch or keep track of all updated components to emit them
      for (const comp of bom.components) {
        const updatedComponent = await Item.findOne({ _id: comp.itemId._id, companyId: cid });
        if (updatedComponent) {
          io.to(room).emit('item_updated', updatedComponent);
          AlertService.checkStockAndAlert(updatedComponent).catch(console.error);
        }
      }
    } else {
      AlertService.checkStockAndAlert(outputItemUpdate).catch(console.error);
      for (const comp of bom.components) {
        const updatedComponent = await Item.findOne({ _id: comp.itemId._id, companyId: cid });
        if (updatedComponent) AlertService.checkStockAndAlert(updatedComponent).catch(console.error);
      }
    }

    res.status(201).json({ success: true, produced: outputQtyTotal, prodLog: prodLog[0], inTx, outTxs });
  } catch (e) {
    await dbSession.abortTransaction();
    dbSession.endSession();
    res.status(statusFor(e)).json({ message: friendly(e) });
  }
});

// ── GET /api/bom/:id/production-history ──────────────────────────────────────
router.get('/:id/production-history', protect, async (req, res) => {
  try {
    const history = await BomProduction.find({ bomId: req.params.id, companyId: req.user.companyId })
      .populate('userId', 'name nameEn')
      .populate('projectId', 'name')
      .populate('outputItemId', 'name nameEn')
      .populate('componentsUsed.itemId', 'name nameEn')
      .sort({ createdAt: -1 });
    res.json(history);
  } catch (e) {
    res.status(statusFor(e)).json({ message: friendly(e) });
  }
});

module.exports = router;
