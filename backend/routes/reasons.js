const express = require("express");
const { Reason } = require("../models");
const { protect } = require("../middleware/auth");
const { friendly, statusFor } = require("../errors");
const { broadcast } = require("../utils/broadcast");

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  try {
    const reasons = await Reason.find({ companyId: req.user.companyId }).sort({ name: 1 });
    res.json(reasons);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

router.post("/", async (req, res) => {
  try {
    const reason = new Reason({ ...req.body, companyId: req.user.companyId });
    await reason.save();
    broadcast(req, "refresh_reasons");
    res.status(201).json(reason);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

router.put("/:id", async (req, res) => {
  try {
    const reason = await Reason.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { new: true }
    );
    broadcast(req, "refresh_reasons");
    res.json(reason);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await Reason.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    broadcast(req, "refresh_reasons");
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
