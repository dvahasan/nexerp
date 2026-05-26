const express  = require('express');
const { Bin }  = require('../models');
const { protect, need }       = require('../middleware/auth');
const { friendly, statusFor } = require('../errors');

const router = express.Router();

// ── GET /api/bins?warehouseId=xxx ────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const q = { companyId: req.user.companyId };
    if (req.query.warehouseId) q.warehouseId = req.query.warehouseId;
    if (req.query.active !== undefined) q.active = req.query.active !== 'false';
    const bins = await Bin.find(q).sort({ code: 1 });
    res.json(bins);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/bins ───────────────────────────────────────────────────────────
router.post('/', protect, need('canManageDepts'), async (req, res) => {
  try {
    const doc = await Bin.create({ ...req.body, companyId: req.user.companyId });
    res.status(201).json(doc);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── PUT /api/bins/:id ────────────────────────────────────────────────────────
router.put('/:id', protect, need('canManageDepts'), async (req, res) => {
  try {
    const bin = await Bin.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { returnDocument: 'after', runValidators: true, new: true }
    );
    if (!bin) return res.status(404).json({ message: 'Bin not found' });
    res.json(bin);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── DELETE /api/bins/:id ─────────────────────────────────────────────────────
router.delete('/:id', protect, need('canManageDepts'), async (req, res) => {
  try {
    await Bin.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
