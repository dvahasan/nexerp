/**
 * backend/routes/barcode.js
 * Server-side barcode lookup proxy — avoids CORS issues when calling
 * external product databases from the browser.
 *
 * GET /api/barcode/:code   → { barcode, results: [...] }
 */
const express = require("express");
const { protect } = require("../middleware/auth");

const router = express.Router();

// ── Timeout helper (avoids AbortSignal/undici connection pool issues) ─────────
// Resolves to null if fn() takes longer than `ms` milliseconds.
function withTimeout(fn, ms) {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), ms);
    Promise.resolve()
      .then(() => fn())
      .then(val  => { clearTimeout(timer); resolve(val);  })
      .catch(()  => { clearTimeout(timer); resolve(null); });
  });
}

// ── Source fetchers ───────────────────────────────────────────────────────────

async function fetchOpenFoodFacts(barcode) {
  return withTimeout(async () => {
    const r = await fetch(
      `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(barcode)}.json`,
      { headers: { "User-Agent": "NexINV/2.0 (contact@nexinv.app)" } }
    );
    if (!r.ok) return null;
    const d = await r.json();
    if (d.status !== "success" || !d.product) return null;
    const p = d.product;
    return {
      source:      "Open Food Facts",
      sourceUrl:   `https://world.openfoodfacts.org/product/${barcode}`,
      name:        p.product_name || p.product_name_en || p.product_name_ar || "",
      brand:       p.brands || "",
      category:    p.categories_tags?.[0]?.replace("en:", "").replace(/-/g, " ") || p.categories || "",
      image:       p.image_url || p.image_front_url || "",
      quantity:    p.quantity || "",
      countries:   p.countries || "",
      ingredients: p.ingredients_text || p.ingredients_text_en || "",
      nutrition: p.nutriments ? {
        energy:  p.nutriments["energy-kcal_100g"] ? `${p.nutriments["energy-kcal_100g"]} kcal/100g` : "",
        fat:     p.nutriments["fat_100g"]          != null ? `${p.nutriments["fat_100g"]}g fat/100g`        : "",
        protein: p.nutriments["proteins_100g"]     != null ? `${p.nutriments["proteins_100g"]}g protein/100g`   : "",
        carbs:   p.nutriments["carbohydrates_100g"]!= null ? `${p.nutriments["carbohydrates_100g"]}g carbs/100g` : "",
      } : null,
      barcode,
    };
  }, 9000);
}

async function fetchUPCItemDB(barcode) {
  return withTimeout(async () => {
    const r = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`
    );
    if (!r.ok) return null;
    const d = await r.json();
    const item = d.items?.[0];
    if (!item) return null;
    return {
      source:      "UPC Item DB",
      sourceUrl:   `https://www.upcitemdb.com/upc/${barcode}`,
      name:        item.title || "",
      brand:       item.brand || "",
      category:    item.category || "",
      image:       item.images?.[0] || "",
      quantity:    item.size || "",
      countries:   "",
      ingredients: item.description || "",
      nutrition:   null,
      barcode,
    };
  }, 9000);
}

async function fetchOpenLibrary(barcode) {
  // ISBN-13 starts with 978 or 979
  if (!/^97[89]/.test(barcode)) return null;
  return withTimeout(async () => {
    const r = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${barcode}&jscmd=data&format=json`
    );
    if (!r.ok) return null;
    const d = await r.json();
    const key = Object.keys(d)[0];
    if (!key || !d[key]) return null;
    const b = d[key];
    return {
      source:      "Open Library",
      sourceUrl:   b.url || `https://openlibrary.org/isbn/${barcode}`,
      name:        b.title || "",
      brand:       b.authors?.map(a => a.name).join(", ") || "",
      category:    "Book",
      image:       b.cover?.large || b.cover?.medium || "",
      quantity:    b.number_of_pages ? `${b.number_of_pages} pages` : "",
      countries:   "",
      ingredients: b.subjects?.slice(0, 6).map(s => s.name || s).join(", ") || "",
      nutrition:   null,
      barcode,
    };
  }, 9000);
}

async function fetchOpenGTIN(barcode) {
  return withTimeout(async () => {
    const r = await fetch(
      `https://opengtindb.org/?ean=${encodeURIComponent(barcode)}&cmd=ean&lang=en`,
      { headers: { "User-Agent": "NexINV/2.0" } }
    );
    if (!r.ok) return null;
    const text = await r.text();
    const data = {};
    for (const line of text.split("\n")) {
      const eq = line.indexOf("=");
      if (eq > 0) data[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
    if (data.error || (!data.name && !data.detailname)) return null;
    return {
      source:      "OpenGTIN DB",
      sourceUrl:   `https://opengtindb.org/?ean=${barcode}&cmd=ean`,
      name:        data.detailname || data.name || "",
      brand:       data.vendor || "",
      category:    data.maincategory || data.categories || "",
      image:       "",
      quantity:    data.contents || data.packagingsize || "",
      countries:   data.origincountry || "",
      ingredients: data.description || "",
      nutrition:   null,
      barcode,
    };
  }, 9000);
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.get("/:code", protect, async (req, res) => {
  const { code } = req.params;
  if (!code || code.trim().length < 3) {
    return res.status(400).json({ message: "Barcode too short" });
  }

  try {
    // 1. Check local inventory first
    const { Item } = require("../models");
    const localItem = await Item.findOne({ barcode: code, companyId: req.user.companyId });
    if (localItem) {
      return res.json({
        barcode: code,
        results: [{
          source: "Local Inventory",
          sourceUrl: "",
          name: localItem.name,
          nameEn: localItem.nameEn,
          category: localItem.catId || "",
          image: localItem.photo || "",
          quantity: localItem.qty || "",
          description: localItem.description || "",
          barcode: localItem.barcode
        }]
      });
    }

    // 2. If not found locally, run all four external sources in parallel
    const [r1, r2, r3, r4] = await Promise.all([
      fetchOpenFoodFacts(code),
      fetchUPCItemDB(code),
      fetchOpenLibrary(code),
      fetchOpenGTIN(code),
    ]);

    const results = [r1, r2, r3, r4].filter(Boolean);
    res.json({ barcode: code, results });
  } catch (e) {
    res.status(500).json({ message: e.message || "Lookup failed" });
  }
});

module.exports = router;
