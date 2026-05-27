const express = require("express");
const { Project } = require("../models");
const { protect } = require("../middleware/auth");
const { friendly, statusFor } = require("../errors");
const { broadcast } = require("../utils/broadcast");

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  try {
    const projects = await Project.find({ companyId: req.user.companyId }).sort({ name: 1 });
    res.json(projects);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

router.post("/", async (req, res) => {
  try {
    const project = new Project({ ...req.body, companyId: req.user.companyId });
    await project.save();
    broadcast(req, "refresh_projects");
    res.status(201).json(project);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

router.put("/:id", async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { new: true }
    );
    broadcast(req, "refresh_projects");
    res.json(project);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await Project.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    broadcast(req, "refresh_projects");
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
