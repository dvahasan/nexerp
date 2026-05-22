const express = require("express");
const { Department, Item } = require("../models");
const { protect, need }    = require("../middleware/auth");
const { broadcast }        = require("../utils/broadcast");
const { friendly, statusFor } = require("../errors");

const router = express.Router();

// GET /api/departments
router.get("/", protect, async (req, res) => {
  try {
    res.json(await Department.find({ companyId: req.user.companyId, active: true }).sort({ name: 1 }));
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// POST /api/departments
router.post("/", protect, need("canManageDepts"), async (req, res) => {
  try {
    const doc = await Department.create({ ...req.body, companyId: req.user.companyId });
    broadcast(req, "dept_added", doc);
    res.status(201).json(doc);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// PUT /api/departments/:id
router.put("/:id", protect, need("canManageDepts"), async (req, res) => {
  try {
    const doc = await Department.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { returnDocument: "after" }
    );
    broadcast(req, "dept_updated", doc);
    res.json(doc);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// DELETE /api/departments/:id
router.delete("/:id", protect, need("canManageDepts"), async (req, res) => {
  try {
    if (await Item.findOne({ deptId: req.params.id, companyId: req.user.companyId }))
      return res.status(400).json({ message: "Department has items" });
    await Department.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { active: false }
    );
    broadcast(req, "dept_deleted", req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
