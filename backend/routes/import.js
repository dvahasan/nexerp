const express = require("express");
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const mongoose = require("mongoose");
const { Item, Company, Ledger } = require("../models");
const { protect, need } = require("../middleware/auth");
const { friendly, statusFor } = require("../errors");
const { broadcast } = require("../utils/broadcast");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // match the server's 10mb JSON limit
});

// Core fields we natively support
const CORE_FIELDS = ["name", "nameEn", "sku", "barcode", "price", "qty", "minThreshold", "description"];

// ── POST /api/import/csv ──────────────────────────────────────────────────
router.post("/csv", protect, need("canAdd"), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const company = await Company.findById(req.user.companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    // Parse CSV
    const csvData = req.file.buffer.toString("utf8");
    const records = parse(csvData, { columns: true, skip_empty_lines: true });
    
    if (records.length === 0) return res.status(400).json({ message: "Empty CSV" });

    const headers = Object.keys(records[0]);
    let columnMap = {}; // { csvHeader: coreField }

    // ── 1. Smart Column Mapping (LLM) ─────────────────────────
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = require("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const prompt = `You are a data mapper. Map these CSV headers: [${headers.join(", ")}] to our core fields: [${CORE_FIELDS.join(", ")}].
Output strictly valid JSON as an object where keys are CSV headers and values are the core fields. If a header doesn't fit a core field exactly, omit it from the JSON.
Example CSV row: ${JSON.stringify(records[0])}`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        
        let rawText = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(rawText);
        // The model's output (and the CSV headers that steer it) are untrusted:
        // keep only real headers mapped to allowed core fields.
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          for (const [header, field] of Object.entries(parsed)) {
            if (headers.includes(header) && CORE_FIELDS.includes(field)) columnMap[header] = field;
          }
        }
      } catch (e) { console.error("LLM Mapping failed, falling back to deterministic:", e.message); }
    }
    
    // Deterministic fallback (if LLM fails or no API key)
    if (Object.keys(columnMap).length === 0) {
      headers.forEach(h => {
        const lower = h.toLowerCase();
        if (lower.includes("name") || lower.includes("اسم")) columnMap[h] = "name";
        else if (lower.includes("price") || lower.includes("cost") || lower.includes("سعر")) columnMap[h] = "price";
        else if (lower.includes("qty") || lower.includes("quantity") || lower.includes("الكمية")) columnMap[h] = "qty";
        else if (lower.includes("sku")) columnMap[h] = "sku";
        else if (lower.includes("barcode")) columnMap[h] = "barcode";
      });
    }

    // ── 2. Data Ingestion & SKU Generation ────────────────────
    // Re-importing the same file must not duplicate items: skip rows whose
    // SKU or barcode already exists in this company (or earlier in the file).
    const existing = await Item.find({ companyId: company._id, deletedAt: null }, "sku barcode").lean();
    const seenSku = new Set(existing.map(i => i.sku).filter(Boolean));
    const seenBarcode = new Set(existing.map(i => i.barcode).filter(Boolean));
    let skipped = 0;

    const itemsToInsert = [];
    for (const row of records) {
      const itemDoc = {
        companyId: company._id,
        customAttributes: {},
        type: "unit",
        status: "active"
      };

      // Apply mapping and Catch-All for unmapped attributes
      for (const [header, val] of Object.entries(row)) {
        const coreField = columnMap[header];
        if (coreField) {
          itemDoc[coreField] = coreField === "price" || coreField === "qty" || coreField === "minThreshold" 
            ? Number(val) || 0 
            : val;
        } else {
          // Dynamic catch-all for unrecognized fields!
          itemDoc.customAttributes[header] = val;
        }
      }

      // Default name if missing
      if (!itemDoc.name) {
        itemDoc.name = itemDoc.customAttributes["Item Name"] || "Imported Item";
      }

      // Semantic SKU Logic Layer (Fallback/Deterministic)
      // Ideally, the LLM runs per item or via a batch job here, but to avoid 1000s of API calls, we use the `skuConfig` locally.
      if (!itemDoc.sku && company.skuConfig?.segments?.length > 0) {
        const parts = company.skuConfig.segments.map(seg => {
            const raw = itemDoc.customAttributes[seg.source] || itemDoc[seg.source] || "";
            let p = raw.toString();
            if (seg.transform === "UPPERCASE") p = p.toUpperCase();
            if (seg.maxLength) p = p.substring(0, seg.maxLength);
            return p;
        }).filter(Boolean);
        
        itemDoc.sku = parts.join(company.skuConfig.separator || "-");
      }
      
      // Ultimate fallback if no SKU was parsed
      if (!itemDoc.sku) {
          itemDoc.sku = `SKU-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
      }

      itemDoc.sku = String(itemDoc.sku).trim();
      if (itemDoc.barcode) itemDoc.barcode = String(itemDoc.barcode).trim();
      if (seenSku.has(itemDoc.sku) || (itemDoc.barcode && seenBarcode.has(itemDoc.barcode))) {
        skipped++;
        continue;
      }
      seenSku.add(itemDoc.sku);
      if (itemDoc.barcode) seenBarcode.add(itemDoc.barcode);

      if (!(itemDoc.qty >= 0)) itemDoc.qty = 0;
      itemsToInsert.push(itemDoc);
    }

    // Imported quantities are opening stock: record them in the ledger in the
    // same database transaction so the integrity report stays consistent.
    const session = await mongoose.startSession();
    let inserted;
    try {
      await session.withTransaction(async () => {
        inserted = await Item.insertMany(itemsToInsert, { session });
        const ledgerDocs = inserted.filter(i => i.qty > 0).map(i => ({
          companyId: company._id,
          itemId: i._id,
          type: "ADJUST",
          qtyChange: i.qty,
          qtyBefore: 0,
          qtyAfter: i.qty,
          userId: req.user._id,
          notes: "Opening stock (CSV import)",
        }));
        if (ledgerDocs.length) await Ledger.insertMany(ledgerDocs, { session });
      });
    } finally { session.endSession(); }
    broadcast(req, "items_imported", inserted.length);

    res.json({
      success: true,
      count: inserted.length,
      skippedDuplicates: skipped,
      mappedColumns: columnMap,
      unmappedColumns: headers.filter(h => !columnMap[h])
    });

  } catch (e) {
    console.error("Import error:", e);
    res.status(statusFor(e)).json({ message: friendly(e) });
  }
});

module.exports = router;
