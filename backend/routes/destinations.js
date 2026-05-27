const express = require("express");
const { Destination } = require("../models");
const { protect } = require("../middleware/auth");
const { friendly, statusFor } = require("../errors");
const { broadcast } = require("../utils/broadcast");

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  try {
    const destinations = await Destination.find({ companyId: req.user.companyId }).sort({ name: 1 });
    res.json(destinations);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

router.post("/", async (req, res) => {
  try {
    const dest = new Destination({ ...req.body, companyId: req.user.companyId });
    await dest.save();
    broadcast(req.user.companyId, "refresh_destinations");
    res.status(201).json(dest);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

router.put("/:id", async (req, res) => {
  try {
    const dest = await Destination.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { new: true }
    );
    broadcast(req.user.companyId, "refresh_destinations");
    res.json(dest);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await Destination.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    broadcast(req.user.companyId, "refresh_destinations");
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
