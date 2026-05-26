const express   = require('express');
const mongoose  = require('mongoose');
const { BomTemplate, Item, Transaction } = require('../models');
const { protect, need }       = require('../middleware/auth');
const { friendly, statusFor } = require('../errors');

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
    res.json(bom);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── DELETE /api/bom/:id ───────────────────────────────────────────────────────
router.delete('/:id', protect, need('canDelete'), async (req, res) => {
  try {
    await BomTemplate.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

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

    // 1. Consume each component (StockOut)
    const outTxs = [];
    for (const comp of bom.components) {
      const needed = comp.qty * runQty;
      const item   = await Item.findOne({ _id: comp.itemId._id, companyId: cid }).session(dbSession);
      if (!item) throw new Error(`Component item not found: ${comp.itemId.name}`);
      if (item.qty < needed)
        throw new Error(`Insufficient stock for "${item.name || item.nameEn}" — need ${needed}, have ${item.qty}`);

      item.qty -= needed;
      await item.save({ session: dbSession });

      const [tx] = await Transaction.create([{
        ...txBase, type: 'OUT', itemId: item._id, qty: needed,
        dest: 'Production',
        ...(warehouseId ? { warehouseId } : {}),
      }], { session: dbSession });
      outTxs.push(tx);
    }

    // 2. Create output (StockIn)
    const outputItem = await Item.findOne({ _id: bom.outputItemId._id, companyId: cid }).session(dbSession);
    if (!outputItem) throw new Error('Output item not found');
    const outputQtyTotal = bom.outputQty * runQty;
    outputItem.qty += outputQtyTotal;
    await outputItem.save({ session: dbSession });

    const [inTx] = await Transaction.create([{
      ...txBase, type: 'IN', itemId: outputItem._id, qty: outputQtyTotal,
      source: 'Production',
      ...(warehouseId ? { warehouseId } : {}),
    }], { session: dbSession });

    await dbSession.commitTransaction();
    res.status(201).json({ success: true, produced: outputQtyTotal, inTx, outTxs });
  } catch (e) {
    await dbSession.abortTransaction();
    res.status(statusFor(e)).json({ message: friendly(e) });
  } finally { dbSession.endSession(); }
});

module.exports = router;
