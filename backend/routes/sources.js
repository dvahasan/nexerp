const express = require("express");
const { Source } = require("../models");
const { protect } = require("../middleware/auth");
const { friendly, statusFor } = require("../errors");
const { broadcast } = require("../utils/broadcast");

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  try {
    const sources = await Source.find({ companyId: req.user.companyId }).sort({ name: 1 });
    res.json(sources);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

router.post("/", async (req, res) => {
  try {
    const source = new Source({ ...req.body, companyId: req.user.companyId });
    await source.save();
    broadcast(req.user.companyId, "refresh_sources");
    res.status(201).json(source);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

router.put("/:id", async (req, res) => {
  try {
    const source = await Source.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { new: true }
    );
    broadcast(req.user.companyId, "refresh_sources");
    res.json(source);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await Source.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    broadcast(req.user.companyId, "refresh_sources");
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
