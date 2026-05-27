const express  = require('express');
const { Warehouse, Bin, Item, Transaction } = require('../models');
const { protect, need }     = require('../middleware/auth');
const { friendly, statusFor } = require('../errors');
const { broadcast } = require('../utils/broadcast');

const router = express.Router();

// ── GET /api/warehouses ──────────────────────────────────────────────────────
// Returns all warehouses with occupancy data computed from current item stock.
router.get('/', protect, async (req, res) => {
  try {
    const cid = req.user.companyId;
    const warehouses = await Warehouse.find({ companyId: cid, active: true }).sort({ code: 1 });

    // Compute occupancy for each warehouse
    const result = await Promise.all(warehouses.map(async (wh) => {
      const whObj = wh.toObject({ virtuals: true });

      // Items assigned to this warehouse
      const items = await Item.find({ companyId: cid, warehouseId: wh._id, deletedAt: null });

      // Used pallets = sum of (qty / (palletQty × stackHeight)) per item
      const usedPallets = items.reduce((acc, item) => {
        const unitsPerStack = (item.palletQty || 1) * (item.stackHeight || 1);
        return acc + (item.qty / unitsPerStack);
      }, 0);

      const maxPallets   = whObj.maxPallets || 0;
      const occupancyPct = maxPallets > 0 ? Math.min(100, (usedPallets / maxPallets) * 100) : 0;

      return {
        ...whObj,
        usedPallets:  +usedPallets.toFixed(2),
        maxPallets,
        occupancyPct: +occupancyPct.toFixed(1),
        alert85:      occupancyPct >= 85,
        itemCount:    items.length,
      };
    }));

    res.json(result);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── GET /api/warehouses/:id ──────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const wh = await Warehouse.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!wh) return res.status(404).json({ message: 'Warehouse not found' });

    const cid  = req.user.companyId;
    const whObj = wh.toObject({ virtuals: true });

    const [items, bins] = await Promise.all([
      Item.find({ companyId: cid, warehouseId: wh._id, deletedAt: null })
        .populate('catId', 'name nameEn')
        .populate('deptId', 'name nameEn')
        .sort({ name: 1 }),
      Bin.find({ companyId: cid, warehouseId: wh._id, active: true }).sort({ code: 1 }),
    ]);

    const usedPallets = items.reduce((acc, item) => {
      const unitsPerStack = (item.palletQty || 1) * (item.stackHeight || 1);
      return acc + (item.qty / unitsPerStack);
    }, 0);

    const maxPallets   = whObj.maxPallets || 0;
    const occupancyPct = maxPallets > 0 ? Math.min(100, (usedPallets / maxPallets) * 100) : 0;

    res.json({
      ...whObj,
      usedPallets:  +usedPallets.toFixed(2),
      maxPallets,
      occupancyPct: +occupancyPct.toFixed(1),
      alert85:      occupancyPct >= 85,
      items,
      bins,
    });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/warehouses ─────────────────────────────────────────────────────
router.post('/', protect, need('canManageDepts'), async (req, res) => {
  try {
    const doc = await Warehouse.create({ ...req.body, companyId: req.user.companyId });
    broadcast(req, 'refresh_warehouses');
    res.status(201).json(doc.toObject({ virtuals: true }));
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── PUT /api/warehouses/:id ──────────────────────────────────────────────────
router.put('/:id', protect, need('canManageDepts'), async (req, res) => {
  try {
    const wh = await Warehouse.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { returnDocument: 'after', runValidators: true, new: true }
    );
    if (!wh) return res.status(404).json({ message: 'Warehouse not found' });
    broadcast(req, 'refresh_warehouses');
    res.json(wh.toObject({ virtuals: true }));
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── DELETE /api/warehouses/:id ───────────────────────────────────────────────
router.delete('/:id', protect, need('canManageDepts'), async (req, res) => {
  try {
    // Unlink items from this warehouse before deleting
    await Item.updateMany({ warehouseId: req.params.id }, { $unset: { warehouseId: '' } });
    await Bin.deleteMany({ warehouseId: req.params.id, companyId: req.user.companyId });
    await Warehouse.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    broadcast(req, 'refresh_warehouses');
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
