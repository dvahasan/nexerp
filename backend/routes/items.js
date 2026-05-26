const express = require("express");
const { Item, Company }     = require("../models");
const { protect, need }     = require("../middleware/auth");
const upload                = require("../middleware/upload");
const { broadcast }         = require("../utils/broadcast");
const { cloudinary, uploadToCloudinary } = require("../config/cloudinary");
const { friendly, statusFor } = require("../errors");

const router = express.Router();

// ── GET /api/items ────────────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const {
      search, dept, cat, status, stock, page, limit: rawLimit, all,
      barcode: barcodeF, photo: photoF, type: typeF,
      favorites, priceMin, priceMax, hasDescription,
    } = req.query;
    let q = { companyId: req.user.companyId, deletedAt: null };

    if (search) {
      q.$or = [
        { name:    { $regex: search, $options: "i" } },
        { nameEn:  { $regex: search, $options: "i" } },
        { sku:     { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (dept)   q.deptId = dept;
    if (cat)    q.catId  = cat;
    if (status) q.status = status;
    if (typeF)  q.type   = typeF;

    // Stock level
    if (stock === "out") q.qty = 0;
    if (stock === "low") q.$and = [{ qty: { $gt: 0 } }, { $expr: { $lte: ["$qty", "$minThreshold"] } }];
    if (stock === "ok")  q.$expr = { $gt: ["$qty", "$minThreshold"] };

    // Barcode presence
    if (barcodeF === "has")  q.barcode = { $exists: true, $nin: [null, ""] };
    if (barcodeF === "none") q.$and = [...(q.$and || []), { $or: [{ barcode: { $exists: false } }, { barcode: null }, { barcode: "" }] }];

    // Photo presence
    if (photoF === "has")  q.photo = { $exists: true, $nin: [null, ""] };
    if (photoF === "none") q.$and = [...(q.$and || []), { $or: [{ photo: { $exists: false } }, { photo: null }, { photo: "" }] }];

    // Description presence
    if (hasDescription === "yes") q.description = { $exists: true, $nin: [null, ""] };
    if (hasDescription === "no")  q.$and = [...(q.$and || []), { $or: [{ description: { $exists: false } }, { description: null }, { description: "" }] }];

    // Price range
    if (priceMin && !isNaN(priceMin)) q.price = { ...(q.price || {}), $gte: Number(priceMin) };
    if (priceMax && !isNaN(priceMax)) q.price = { ...(q.price || {}), $lte: Number(priceMax) };

    // Favorites
    if (favorites === "1") q.isFavorite = true;

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
    res.json(await Item.findOne({ barcode: req.params.code, companyId: req.user.companyId, $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] }) || null);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── GET /api/items/:id ───────────────────────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, companyId: req.user.companyId, $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] })
      .populate("deptId", "name nameEn color")
      .populate("catId",  "name nameEn");
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/items/import  (owner only — bulk upsert from Odoo export) ──────
// NOTE: must appear before POST /:id routes so Express doesn't capture "import" as an id.
router.post("/import", protect, async (req, res) => {
  try {
    if (req.user.role !== "owner") return res.status(403).json({ message: "Owner only" });
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "No items provided" });

    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (const raw of items) {
      try {
        const {
          name, nameEn, sku, barcode, qty, minThreshold, price, description, status, attributes,
          currency, active, isFavorite, serialCode, updateCount, type, publish, deletedAt
        } = raw;
        if (!name && !nameEn) { results.skipped++; continue; }

        const payload = {
          name:      (name || nameEn || "").trim(),
          nameEn:    (nameEn || name  || "").trim(),
          companyId: req.user.companyId,
        };

        // Standard fields
        if (sku)                                         payload.sku          = String(sku).trim();
        if (barcode)                                     payload.barcode      = String(barcode).trim();
        if (qty          != null && !isNaN(qty))         payload.qty          = Number(qty);
        if (minThreshold != null && !isNaN(minThreshold))payload.minThreshold = Number(minThreshold);
        if (price        != null && !isNaN(price))       payload.price        = Number(price);
        if (description)                                 payload.description  = String(description).trim();
        if (status)                                      payload.status       = String(status).trim();
        if (attributes && typeof attributes === "object" && Object.keys(attributes).length > 0)
                                                         payload.attributes   = attributes;

        // New Odoo fields
        if (currency) payload.currency = String(currency).trim();
        if (serialCode) payload.serialCode = String(serialCode).trim();
        if (type) payload.type = String(type).trim().toLowerCase();
        if (updateCount != null && !isNaN(updateCount)) payload.updateCount = Number(updateCount);
        
        // Boolean parsing
        const parseBool = (val, def) => {
          if (val == null || val === '') return def;
          const s = String(val).trim().toLowerCase();
          return s === 'true' || s === '1' || s === 'yes' || s === 'active';
        };
        if (active !== undefined) payload.active = parseBool(active, true);
        if (isFavorite !== undefined) payload.isFavorite = parseBool(isFavorite, false);
        if (publish !== undefined) payload.publish = parseBool(publish, true);

        // Date parsing
        if (deletedAt) {
          const d = new Date(deletedAt);
          if (!isNaN(d.valueOf())) payload.deletedAt = d;
        }

        // Upsert: match by SKU or barcode
        let existing = null;
        if (payload.sku)
          existing = await Item.findOne({ sku: payload.sku, companyId: req.user.companyId });
        if (!existing && payload.barcode)
          existing = await Item.findOne({ barcode: payload.barcode, companyId: req.user.companyId });

        if (existing) {
          await Item.findByIdAndUpdate(existing._id, payload, { runValidators: true });
          results.updated++;
        } else {
          await Item.create(payload);
          results.created++;
        }
      } catch (rowErr) {
        results.errors.push({ row: raw.name || raw.nameEn || "?", error: rowErr.message });
      }
    }

    res.json(results);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/items ──────────────────────────────────────────────────────────
router.post("/", protect, need("canAdd"), async (req, res) => {
  try {
    const itemDoc = { ...req.body, companyId: req.user.companyId };
    
    if (!itemDoc.sku) {
      const company = await Company.findById(req.user.companyId);
      if (company?.skuConfig?.segments?.length > 0) {
        const parts = company.skuConfig.segments.map(seg => {
            const raw = itemDoc.customAttributes?.[seg.source] || itemDoc[seg.source] || "";
            let p = raw.toString();
            if (seg.transform === "UPPERCASE") p = p.toUpperCase();
            if (seg.maxLength) p = p.substring(0, seg.maxLength);
            return p;
        }).filter(Boolean);
        
        itemDoc.sku = parts.join(company.skuConfig.separator || "-");
      }
      
      if (!itemDoc.sku) {
          itemDoc.sku = `SKU-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
      }
    }

    const doc = await Item.create(itemDoc);
    broadcast(req, "item_added", doc);
    res.status(201).json(doc);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── PUT /api/items/:id ───────────────────────────────────────────────────────
router.put("/:id", protect, need("canEdit"), async (req, res) => {
  try {
    const update = { ...req.body };

    // Never persist an empty SKU — it collides on the unique index.
    // Preserve the existing one or run the smart-SKU engine.
    if (!update.sku) {
      const existing = await Item.findOne(
        { _id: req.params.id, companyId: req.user.companyId },
        "sku"
      );
      if (existing?.sku) {
        // Keep whatever was already stored
        delete update.sku;
      } else {
        // Item never had a SKU — generate one now (same logic as POST)
        const company = await Company.findById(req.user.companyId);
        if (company?.skuConfig?.segments?.length > 0) {
          const parts = company.skuConfig.segments.map(seg => {
            const raw = update.customAttributes?.[seg.source] || update[seg.source] || "";
            let p = raw.toString();
            if (seg.transform === "UPPERCASE") p = p.toUpperCase();
            if (seg.maxLength) p = p.substring(0, seg.maxLength);
            return p;
          }).filter(Boolean);
          update.sku = parts.join(company.skuConfig.separator || "-");
        }
        if (!update.sku) {
          update.sku = `SKU-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        }
      }
    }

    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      update,
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

// ── POST /api/items/:id/photo-from-url ──────────────────────────────────────
// Downloads an external image URL server-side (no browser CORS) and uploads
// it to Cloudinary, then saves it as the item's main photo.
router.post("/:id/photo-from-url", protect, need("canAdd"), async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") return res.status(400).json({ message: "url required" });

    // Fetch image server-side (9 s timeout to keep things snappy)
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    let imgRes;
    try {
      imgRes = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!imgRes.ok) return res.status(400).json({ message: `Could not fetch image (HTTP ${imgRes.status})` });

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const result = await uploadToCloudinary(buffer);
    const image  = { url: result.secure_url, publicId: result.public_id };

    await Item.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { photo: result.secure_url, $push: { images: image } }
    );

    res.json({ photo: result.secure_url, image });
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

// ── POST /api/items/:id/attachment ──────────────────────────────────────────
router.post("/:id/attachment", protect, need("canEdit"), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file provided" });
    const result = await uploadToCloudinary(req.file.buffer, "nexinv/attachments");
    const attach = {
      url:      result.secure_url,
      publicId: result.public_id,
      name:     req.file.originalname,
      size:     req.file.size,
    };
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { $push: { attachments: attach } },
      { returnDocument: "after" }
    );
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json({ attachment: attach, attachments: item.attachments });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── DELETE /api/items/:id/attachments/:publicId ──────────────────────────────
router.delete("/:id/attachments/:publicId", protect, need("canEdit"), async (req, res) => {
  try {
    const publicId = decodeURIComponent(req.params.publicId);
    try { await cloudinary.uploader.destroy(publicId, { resource_type: "raw" }); } catch {}
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { $pull: { attachments: { publicId } } },
      { returnDocument: "after" }
    );
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json({ success: true, attachments: item.attachments });
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
