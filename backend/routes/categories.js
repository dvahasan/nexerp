const express = require("express");
const { Category, Item }   = require("../models");
const { protect, need }    = require("../middleware/auth");
const { broadcast }        = require("../utils/broadcast");
const { friendly, statusFor } = require("../errors");

const router = express.Router();

// GET /api/categories
router.get("/", protect, async (req, res) => {
  try {
    res.json(
      await Category.find({ companyId: req.user.companyId, active: true })
        .populate("deptId", "name nameEn color")
    );
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// POST /api/categories
router.post("/", protect, need("canManageDepts"), async (req, res) => {
  try {
    const doc = await Category.create({ ...req.body, companyId: req.user.companyId });
    broadcast(req, "cat_added", doc);
    res.status(201).json(doc);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// DELETE /api/categories/:id
router.delete("/:id", protect, need("canManageDepts"), async (req, res) => {
  try {
    if (await Item.findOne({ catId: req.params.id, companyId: req.user.companyId }))
      return res.status(400).json({ message: "Category has items" });
    await Category.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { active: false }
    );
    broadcast(req, "cat_deleted", req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
