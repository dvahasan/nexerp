const express  = require("express");
const mongoose = require("mongoose");
const { Item, Company, Batch, Ledger } = require("../models");
const { protect, need }     = require("../middleware/auth");
const upload                = require("../middleware/upload");
const { broadcast }         = require("../utils/broadcast");
const { cloudinary, uploadToCloudinary } = require("../config/cloudinary");
const { friendly, statusFor, httpError } = require("../errors");
const AlertService          = require("../services/AlertService");
const { openingBatchForExistingStock } = require("../services/batchStock");
const { fetchPublicImage }  = require("../utils/safeFetch");
const { recordAdjustment, PROTECTED_ITEM_FIELDS } = require("../services/stockAdjust");

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

// ── GET /api/items/reorder/suggestions ───────────────────────────────────────
// Items at or below their reorder point, with a suggested purchase quantity.
// Must stay above the /:id route so "reorder" isn't matched as an id.
router.get("/reorder/suggestions", protect, async (req, res) => {
  try {
    const items = await Item.find({
      companyId: req.user.companyId,
      status: "active",
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      reorderPoint: { $gt: 0 },
      $expr: { $lte: ["$qty", "$reorderPoint"] },
    })
      .select("name nameEn sku barcode qty reorderPoint reorderQty minThreshold avgCost price warehouseId")
      .populate("warehouseId", "name code")
      .sort({ qty: 1 });

    const suggestions = items.map((i) => {
      // Order up to 2× the reorder point by default, or the configured reorderQty
      const suggestedQty = i.reorderQty > 0 ? i.reorderQty : Math.max(i.reorderPoint * 2 - i.qty, 1);
      return {
        itemId: i._id,
        name: i.name, nameEn: i.nameEn, sku: i.sku, barcode: i.barcode,
        qty: i.qty, reorderPoint: i.reorderPoint,
        suggestedQty,
        estimatedCost: +(suggestedQty * (i.avgCost || 0)).toFixed(2),
        warehouse: i.warehouseId || null,
        urgency: i.qty <= 0 ? "critical" : i.qty <= (i.minThreshold || 0) ? "high" : "normal",
      };
    });

    res.json({
      count: suggestions.length,
      totalEstimatedCost: +suggestions.reduce((s, x) => s + x.estimatedCost, 0).toFixed(2),
      suggestions,
    });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── GET /api/items/barcode/:code ─────────────────────────────────────────────
router.get("/barcode/:code", protect, async (req, res) => {
  try {
    res.json(await Item.findOne({ barcode: req.params.code, companyId: req.user.companyId, $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] }) || null);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── GET /api/items/:id/batches ───────────────────────────────────────────────
// All lots/batches of one item, FEFO order, with days-to-expiry per batch.
router.get("/:id/batches", protect, async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, companyId: req.user.companyId })
      .select("name nameEn sku qty trackBatches");
    if (!item) return res.status(404).json({ message: "Not found" });

    const batches = await Batch.find({ companyId: req.user.companyId, itemId: item._id })
      .populate("warehouseId", "name code")
      .sort({ expiryDate: 1, createdAt: 1 });

    const DAY_MS = 24 * 60 * 60 * 1000;
    const rows = batches.map((b) => ({
      ...b.toObject(),
      daysToExpiry: b.expiryDate == null
        ? null
        : Math.ceil((new Date(b.expiryDate) - Date.now()) / DAY_MS),
    }));

    res.json({
      item: { _id: item._id, name: item.name, nameEn: item.nameEn, sku: item.sku, qty: item.qty, trackBatches: item.trackBatches },
      batches: rows,
      totalRemaining: rows.reduce((s, b) => s + b.qtyRemaining, 0),
    });
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
router.post("/import", protect, need("canAdd"), need("canEdit"), async (req, res) => {
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

        if (existing && existing.trackBatches && payload.qty !== undefined && payload.qty !== existing.qty)
          throw new Error("Quantity of a batch-tracked item can only change through Stock In / Stock Out");

        // Each row is its own DB transaction so a qty change and its ADJUST
        // ledger row land together.
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            if (existing) {
              const updated = await Item.findByIdAndUpdate(existing._id, payload,
                { runValidators: true, returnDocument: "after", session });
              await recordAdjustment({
                companyId: req.user.companyId, item: updated, qtyBefore: existing.qty, qtyAfter: updated.qty,
                userId: req.user._id, notes: "Quantity set by item import", session,
              });
            } else {
              const [created] = await Item.create([payload], { session });
              await recordAdjustment({
                companyId: req.user.companyId, item: created, qtyBefore: 0, qtyAfter: created.qty,
                userId: req.user._id, notes: "Opening stock (item import)", session,
              });
            }
          });
        } finally { session.endSession(); }
        if (existing) results.updated++; else results.created++;
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
    const itemDoc = { ...req.body };
    for (const k of [...PROTECTED_ITEM_FIELDS, "deletedAt"]) delete itemDoc[k];
    itemDoc.companyId = req.user.companyId;
    itemDoc.qty = Math.max(0, Number(itemDoc.qty) || 0);

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

    // Opening stock is recorded in the ledger in the same DB transaction.
    const session = await mongoose.startSession();
    let doc;
    try {
      await session.withTransaction(async () => {
        [doc] = await Item.create([itemDoc], { session });
        await recordAdjustment({
          companyId: req.user.companyId, item: doc, qtyBefore: 0, qtyAfter: doc.qty,
          userId: req.user._id, notes: "Opening stock (item created)", session,
        });
        if (doc.trackBatches) await openingBatchForExistingStock({ companyId: req.user.companyId, item: doc, session });
      });
    } finally { session.endSession(); }

    broadcast(req, "item_added", doc);
    res.status(201).json(doc);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── PUT /api/items/:id ───────────────────────────────────────────────────────
router.put("/:id", protect, need("canEdit"), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const update = { ...req.body };

    // Fields that are owned by the transaction engine or the tenant boundary
    // must never be written from an edit form.
    for (const k of ["_id", "companyId", "avgCost", "reservedQty", "deletedAt", "createdAt", "updatedAt"])
      delete update[k];

    const current = await Item.findOne({ _id: req.params.id, companyId: req.user.companyId }).session(session);
    if (!current) throw httpError(404, "Not found");

    // A changed qty is a stock adjustment: apply it with a ledger entry so the
    // ledger keeps reconciling with Item.qty.
    let adjust = null;
    if (update.qty !== undefined) {
      const newQty = Number(update.qty);
      delete update.qty;
      if (!Number.isFinite(newQty) || newQty < 0) throw httpError(400, "Quantity must be zero or more");
      if (newQty !== current.qty) {
        if (current.trackBatches)
          throw httpError(400, "Quantity of a batch-tracked item can only change through Stock In / Stock Out");
        adjust = { qtyBefore: current.qty, qtyAfter: newQty };
      }
    }

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

    if (adjust) update.qty = adjust.qtyAfter;

    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      update,
      { returnDocument: "after", runValidators: true, session }
    );

    if (adjust) {
      await Ledger.create([{
        companyId: req.user.companyId,
        itemId: item._id,
        type: "ADJUST",
        qtyChange: adjust.qtyAfter - adjust.qtyBefore,
        qtyBefore: adjust.qtyBefore,
        qtyAfter: adjust.qtyAfter,
        warehouseId: item.warehouseId || null,
        userId: req.user._id,
        notes: req.body.adjustReason || "Manual quantity adjustment (item edit)",
      }], { session });
      await AlertService.checkStockAndAlert(item, session);
    }

    // Turning batch tracking on: existing stock goes into an OPENING batch.
    if (item.trackBatches && !current.trackBatches) {
      await openingBatchForExistingStock({ companyId: req.user.companyId, item, session });
    }

    await session.commitTransaction();

    const populated = await Item.findById(item._id)
      .populate("deptId", "name nameEn color").populate("catId", "name nameEn");
    broadcast(req, "item_updated", populated);
    res.json(populated);
  } catch (e) {
    await session.abortTransaction();
    res.status(statusFor(e)).json({ message: friendly(e) });
  } finally { session.endSession(); }
});

// ── DELETE /api/items/:id ────────────────────────────────────────────────────
router.delete("/:id", protect, need("canDelete"), async (req, res) => {
  try {
    // Soft delete: transactions, ledger rows and batches keep pointing at a
    // real item, and every item query already excludes deletedAt != null.
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId, deletedAt: null },
      { $set: { deletedAt: new Date(), status: "inactive" } },
      { returnDocument: "after" }
    );
    if (!item) return res.status(404).json({ message: "Not found" });
    broadcast(req, "item_deleted", { _id: item._id });
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

    const item = await Item.findOne({ _id: req.params.id, companyId: req.user.companyId, deletedAt: null });
    if (!item) return res.status(404).json({ message: "Not found" });

    const buffer = await fetchPublicImage(url);
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
