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
    if (!req.body.parentId || req.body.parentId === "") delete req.body.parentId;
    let path = null;
    if (req.body.parentId) {
      const parent = await Category.findOne({ _id: req.body.parentId, companyId: req.user.companyId });
      if (parent) {
        path = `${parent.path || ','}${parent._id},`;
      } else {
        req.body.parentId = null;
      }
    }
    const doc = await Category.create({ ...req.body, path, companyId: req.user.companyId });
    broadcast(req, "cat_added", doc);
    res.status(201).json(doc);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// PUT /api/categories/:id
router.put("/:id", protect, need("canManageDepts"), async (req, res) => {
  try {
    if (!req.body.parentId || req.body.parentId === "") req.body.parentId = null;
    let path = undefined;
    if (req.body.parentId !== undefined) {
      if (req.body.parentId) {
        if (req.body.parentId === req.params.id) return res.status(400).json({ message: "Cannot be parent of itself" });
        const parent = await Category.findOne({ _id: req.body.parentId, companyId: req.user.companyId });
        if (parent) {
          path = `${parent.path || ','}${parent._id},`;
        } else {
          req.body.parentId = null;
          path = null;
        }
      } else {
        path = null;
      }
      req.body.path = path;
    }

    const doc = await Category.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    
    broadcast(req, "cat_updated", doc);
    res.json(doc);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// DELETE /api/categories/:id
router.delete("/:id", protect, need("canManageDepts"), async (req, res) => {
  try {
    if (await Item.findOne({ catId: req.params.id, companyId: req.user.companyId }))
      return res.status(400).json({ message: "Category has items" });
      
    if (await Category.findOne({ parentId: req.params.id, companyId: req.user.companyId, active: true }))
      return res.status(400).json({ message: "Category has active subcategories" });

    await Category.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { active: false }
    );
    broadcast(req, "cat_deleted", req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
