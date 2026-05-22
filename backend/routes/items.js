const express = require("express");
const { Item }              = require("../models");
const { protect, need }     = require("../middleware/auth");
const upload                = require("../middleware/upload");
const { broadcast }         = require("../utils/broadcast");
const { cloudinary, uploadToCloudinary } = require("../config/cloudinary");
const { friendly, statusFor } = require("../errors");

const router = express.Router();

// ── GET /api/items ────────────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const { search, dept, cat, status, stock, page, limit: rawLimit, all } = req.query;
    let q = { companyId: req.user.companyId };

    if (search) {
      q.$or = [
        { name:    { $regex: search, $options: "i" } },
        { nameEn:  { $regex: search, $options: "i" } },
        { sku:     { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ];
    }
    if (dept)   q.deptId = dept;
    if (cat)    q.catId  = cat;
    if (status) q.status = status;
    if (stock === "out") q.qty = 0;
    if (stock === "low") q.$and = [{ qty: { $gt: 0 } }, { $expr: { $lte: ["$qty", "$minThreshold"] } }];
    if (stock === "ok")  q.$expr = { $gt: ["$qty", "$minThreshold"] };

    // ?all=1 → full list for comboboxes (no pagination)
    if (all === "1") {
      const items = await Item.find(q)
        .populate("deptId", "name nameEn color")
        .populate("catId",  "name nameEn")
        .sort({ createdAt: -1 }).limit(500);
      return res.json(items);
    }

    const pg    = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(50, parseInt(rawLimit) || 12);
    const skip  = (pg - 1) * limit;
    const [items, total] = await Promise.all([
      Item.find(q)
        .populate("deptId", "name nameEn color")
        .populate("catId",  "name nameEn")
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit),
      Item.countDocuments(q),
    ]);
    res.json({ items, total, page: pg, pages: Math.ceil(total / limit) });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── GET /api/items/barcode/:code ─────────────────────────────────────────────
router.get("/barcode/:code", protect, async (req, res) => {
  try {
    res.json(await Item.findOne({ barcode: req.params.code, companyId: req.user.companyId }) || null);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── GET /api/items/:id ───────────────────────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, companyId: req.user.companyId })
      .populate("deptId", "name nameEn color")
      .populate("catId",  "name nameEn");
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/items ──────────────────────────────────────────────────────────
router.post("/", protect, need("canAdd"), async (req, res) => {
  try {
    const doc = await Item.create({ ...req.body, companyId: req.user.companyId });
    broadcast(req, "item_added", doc);
    res.status(201).json(doc);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── PUT /api/items/:id ───────────────────────────────────────────────────────
router.put("/:id", protect, need("canEdit"), async (req, res) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { returnDocument: "after", runValidators: true }
    ).populate("deptId", "name nameEn color").populate("catId", "name nameEn");
    if (!item) return res.status(404).json({ message: "Not found" });
    broadcast(req, "item_updated", item);
    res.json(item);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── DELETE /api/items/:id ────────────────────────────────────────────────────
router.delete("/:id", protect, need("canDelete"), async (req, res) => {
  try {
    await Item.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/items/:id/photo ─────────────────────────────────────────────────
router.post("/:id/photo", protect, need("canEdit"), upload.single("photo"), async (req, res) => {
  try {
    const result = await uploadToCloudinary(req.file.buffer);
    const image  = { url: result.secure_url, publicId: result.public_id };
    await Item.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { photo: result.secure_url, $push: { images: image } }
    );
    res.json({ photo: result.secure_url, image });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/items/:id/photos ────────────────────────────────────────────────
router.post("/:id/photos", protect, need("canEdit"), upload.single("photo"), async (req, res) => {
  try {
    const result = await uploadToCloudinary(req.file.buffer);
    const image  = { url: result.secure_url, publicId: result.public_id };
    const item   = await Item.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { $push: { images: image } },
      { returnDocument: "after" }
    );
    res.json({ image, images: item.images });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── DELETE /api/items/:id/photos/:publicId ───────────────────────────────────
router.delete("/:id/photos/:publicId", protect, need("canEdit"), async (req, res) => {
  try {
    const publicId = decodeURIComponent(req.params.publicId);
    try { await cloudinary.uploader.destroy(publicId); } catch {}

    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { $pull: { images: { publicId } } },
      { returnDocument: "after" }
    );

    // Keep photo field in sync
    const stillHas = item.images.find(img => img.publicId === publicId);
    if (!stillHas && item.photo && item.images.length > 0) {
      await Item.findOneAndUpdate({ _id: req.params.id, companyId: req.user.companyId }, { photo: item.images[0].url });
    } else if (item.images.length === 0) {
      await Item.findOneAndUpdate({ _id: req.params.id, companyId: req.user.companyId }, { photo: "" });
    }

    const updated = await Item.findOne({ _id: req.params.id, companyId: req.user.companyId });
    res.json({ success: true, images: updated.images, photo: updated.photo });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
