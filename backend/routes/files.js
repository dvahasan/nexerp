const express = require("express");
const { File }                   = require("../models");
const { protect }                = require("../middleware/auth");
const upload                     = require("../middleware/upload");
const { cloudinary, uploadToCloudinary } = require("../config/cloudinary");
const { broadcast }              = require("../utils/broadcast");
const { friendly, statusFor }    = require("../errors");

const router = express.Router();

// ── GET /api/files ────────────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const files = await File.find({ companyId: req.user.companyId })
      .populate("uploaderId", "name nameEn username")
      .populate("itemId",     "name nameEn")
      .sort({ createdAt: -1 });
    res.json(files);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/files ───────────────────────────────────────────────────────────
router.post("/", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file provided" });
    const { itemId } = req.body;

    const companyCode = req.user.companyId.toString();
    const folder = itemId
      ? `nexinv/${companyCode}/${itemId}`
      : `nexinv/${companyCode}/general`;

    const result = await uploadToCloudinary(req.file.buffer, folder);

    const doc = await File.create({
      companyId:    req.user.companyId,
      itemId:       itemId || null,
      uploaderId:   req.user._id,
      name:         req.file.originalname,
      url:          result.secure_url,
      type:         req.file.mimetype,
      size:         req.file.size,
      cloudinaryId: result.public_id,
    });

    broadcast(req, "file_added", doc);
    res.status(201).json(doc);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── DELETE /api/files/:id ─────────────────────────────────────────────────────
router.delete("/:id", protect, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!file) return res.status(404).json({ message: "File not found" });

    // Attempt Cloudinary deletion for both raw and image resource types
    try { await cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: "raw" });   } catch {}
    try { await cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: "image" }); } catch {}

    await file.deleteOne();
    broadcast(req, "file_deleted", req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
