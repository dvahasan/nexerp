const express = require('express');
const { Item, Company } = require('../models');
const { friendly, statusFor } = require('../errors');

const router = express.Router();

// Middleware to authenticate via API Key
const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.header('X-API-Key') || req.query.apiKey;
  if (!apiKey) return res.status(401).json({ message: 'API key is required' });

  try {
    const company = await Company.findOne({ apiKeys: apiKey });
    if (!company) return res.status(403).json({ message: 'Invalid API key' });

    req.companyId = company._id;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// ── GET /api/public/inventory ────────────────────────────────────────────────
router.get('/inventory', authenticateApiKey, async (req, res) => {
  try {
    const items = await Item.find({ companyId: req.companyId })
      .select('name nameEn sku qty price categoryId departmentId createdAt')
      .populate('categoryId', 'name nameEn')
      .populate('departmentId', 'name nameEn');
    res.json({ success: true, count: items.length, data: items });
  } catch (e) {
    res.status(statusFor(e)).json({ message: friendly(e) });
  }
});

// ── GET /api/public/inventory/:sku ───────────────────────────────────────────
router.get('/inventory/:sku', authenticateApiKey, async (req, res) => {
  try {
    const item = await Item.findOne({ sku: req.params.sku, companyId: req.companyId })
      .select('name nameEn sku qty price categoryId departmentId')
      .populate('categoryId', 'name nameEn')
      .populate('departmentId', 'name nameEn');
    
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ success: true, data: item });
  } catch (e) {
    res.status(statusFor(e)).json({ message: friendly(e) });
  }
});

module.exports = router;
