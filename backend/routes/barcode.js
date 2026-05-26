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

    // Collect all images
    const images = [];
    if (p.image_url)       images.push(p.image_url);
    if (p.image_front_url && p.image_front_url !== p.image_url) images.push(p.image_front_url);
    if (p.image_ingredients_url) images.push(p.image_ingredients_url);
    if (p.image_nutrition_url)   images.push(p.image_nutrition_url);

    // Build extra attributes
    const attributes = {};
    if (p.packaging)            attributes["Packaging"]    = p.packaging;
    if (p.labels)               attributes["Labels"]       = p.labels;
    if (p.stores)               attributes["Stores"]       = p.stores;
    if (p.countries)            attributes["Origin"]       = p.countries;
    if (p.manufacturing_places) attributes["Manufactured"] = p.manufacturing_places;

    const nutri = p.nutriments;
    if (nutri) {
      if (nutri["energy-kcal_100g"] != null) attributes["Energy (per 100g)"]      = `${nutri["energy-kcal_100g"]} kcal`;
      if (nutri["fat_100g"]          != null) attributes["Fat (per 100g)"]          = `${nutri["fat_100g"]} g`;
      if (nutri["saturated-fat_100g"]!= null) attributes["Saturated Fat (per 100g)"]= `${nutri["saturated-fat_100g"]} g`;
      if (nutri["carbohydrates_100g"]!= null) attributes["Carbohydrates (per 100g)"]= `${nutri["carbohydrates_100g"]} g`;
      if (nutri["sugars_100g"]       != null) attributes["Sugars (per 100g)"]       = `${nutri["sugars_100g"]} g`;
      if (nutri["fiber_100g"]        != null) attributes["Fiber (per 100g)"]        = `${nutri["fiber_100g"]} g`;
      if (nutri["proteins_100g"]     != null) attributes["Protein (per 100g)"]      = `${nutri["proteins_100g"]} g`;
      if (nutri["salt_100g"]         != null) attributes["Salt (per 100g)"]         = `${nutri["salt_100g"]} g`;
      if (nutri["sodium_100g"]       != null) attributes["Sodium (per 100g)"]       = `${nutri["sodium_100g"]} g`;
    }

    // Build a rich description from ingredients + allergens
    const descParts = [];
    if (p.ingredients_text || p.ingredients_text_en)
      descParts.push(`<strong>Ingredients:</strong> ${p.ingredients_text || p.ingredients_text_en}`);
    if (p.allergens_from_ingredients)
      descParts.push(`<strong>Allergens:</strong> ${p.allergens_from_ingredients}`);

    return {
      source:      "Open Food Facts",
      sourceUrl:   `https://world.openfoodfacts.org/product/${barcode}`,
      name:        p.product_name_ar || p.product_name || p.product_name_en || "",
      nameEn:      p.product_name_en || p.product_name || "",
      brand:       p.brands       || "",
      category:    (p.categories_tags?.[0]?.replace("en:", "").replace(/-/g, " ")) || p.categories || "",
      image:       images[0] || "",
      images,
      quantity:    p.quantity     || "",
      weight:      p.quantity     || "",   // OFF stores weight/volume in "quantity"
      description: descParts.join("<br><br>"),
      countries:   p.countries    || "",
      attributes,
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

    // Build attributes from available spec fields
    const attributes = {};
    if (item.brand)       attributes["Brand"]      = item.brand;
    if (item.model)       attributes["Model"]      = item.model;
    if (item.color)       attributes["Color"]      = item.color;
    if (item.size)        attributes["Size"]       = item.size;
    if (item.weight)      attributes["Weight"]     = item.weight;
    if (item.dimension)   attributes["Dimensions"] = item.dimension;
    if (item.currency && item.lowest_recorded_price)
      attributes["Lowest Price"] = `${item.currency} ${item.lowest_recorded_price}`;

    return {
      source:      "UPC Item DB",
      sourceUrl:   `https://www.upcitemdb.com/upc/${barcode}`,
      name:        item.title     || "",
      nameEn:      item.title     || "",
      brand:       item.brand     || "",
      category:    item.category  || "",
      image:       item.images?.[0] || "",
      images:      item.images    || [],
      quantity:    item.size      || "",
      weight:      item.weight    || "",
      dimensions:  item.dimension || "",
      model:       item.model     || "",
      color:       item.color     || "",
      description: item.description || "",
      countries:   "",
      attributes,
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

    const authors = b.authors?.map(a => a.name).join(", ") || "";
    const publishers = b.publishers?.map(p => p.name).join(", ") || "";
    const subjects = b.subjects?.slice(0, 8).map(s => s.name || s).join(", ") || "";

    const attributes = {};
    if (authors)               attributes["Author(s)"]    = authors;
    if (publishers)            attributes["Publisher"]    = publishers;
    if (b.publish_date)        attributes["Publish Date"] = b.publish_date;
    if (b.number_of_pages)     attributes["Pages"]        = String(b.number_of_pages);
    if (b.physical_format)     attributes["Format"]       = b.physical_format;
    if (b.languages?.length)   attributes["Language"]     = b.languages.map(l => l.key?.split("/").pop()).join(", ");
    if (subjects)              attributes["Subjects"]     = subjects;

    const images = [];
    if (b.cover?.large)  images.push(b.cover.large);
    else if (b.cover?.medium) images.push(b.cover.medium);
    else if (b.cover?.small)  images.push(b.cover.small);

    return {
      source:      "Open Library",
      sourceUrl:   b.url || `https://openlibrary.org/isbn/${barcode}`,
      name:        b.title || "",
      nameEn:      b.title || "",
      brand:       authors,
      category:    "Book",
      image:       images[0] || "",
      images,
      quantity:    b.number_of_pages ? `${b.number_of_pages} pages` : "",
      weight:      "",
      description: subjects ? `<strong>Subjects:</strong> ${subjects}` : "",
      countries:   "",
      attributes,
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

    const attributes = {};
    if (data.vendor)       attributes["Brand"]       = data.vendor;
    if (data.maincategory) attributes["Category"]    = data.maincategory;
    if (data.categories)   attributes["Subcategory"] = data.categories;
    if (data.packagingsize)attributes["Package Size"]= data.packagingsize;
    if (data.origincountry)attributes["Origin"]      = data.origincountry;

    return {
      source:      "OpenGTIN DB",
      sourceUrl:   `https://opengtindb.org/?ean=${barcode}&cmd=ean`,
      name:        data.detailname  || data.name || "",
      nameEn:      data.detailname  || data.name || "",
      brand:       data.vendor      || "",
      category:    data.maincategory|| data.categories || "",
      image:       "",
      images:      [],
      quantity:    data.contents    || data.packagingsize || "",
      weight:      data.contents    || "",
      description: data.description || "",
      countries:   data.origincountry || "",
      attributes,
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
    // Run all external sources in parallel — always search the internet
    const [r1, r2, r3, r4] = await Promise.all([
      fetchOpenFoodFacts(code),
      fetchUPCItemDB(code),
      fetchOpenLibrary(code),
      fetchOpenGTIN(code),
    ]);

    const results = [r1, r2, r3, r4].filter(Boolean);

    // Build a merged "best" result from all sources (first non-empty wins per field)
    if (results.length > 1) {
      const merged = {
        source:      results.map(r => r.source).join(" + "),
        sourceUrl:   results[0].sourceUrl,
        barcode:     code,
        name:        results.find(r => r.name)?.name        || "",
        nameEn:      results.find(r => r.nameEn)?.nameEn    || "",
        brand:       results.find(r => r.brand)?.brand      || "",
        category:    results.find(r => r.category)?.category|| "",
        image:       results.find(r => r.image)?.image      || "",
        images:      [...new Set(results.flatMap(r => r.images || []).filter(Boolean))],
        quantity:    results.find(r => r.quantity)?.quantity || "",
        weight:      results.find(r => r.weight)?.weight    || "",
        dimensions:  results.find(r => r.dimensions)?.dimensions || "",
        model:       results.find(r => r.model)?.model      || "",
        color:       results.find(r => r.color)?.color      || "",
        description: results.find(r => r.description)?.description || "",
        countries:   results.find(r => r.countries)?.countries || "",
        // Merge all attributes from every source
        attributes:  Object.assign({}, ...results.map(r => r.attributes || {})),
      };
      results.unshift(merged);
    }

    res.json({ barcode: code, results });
  } catch (e) {
    res.status(500).json({ message: e.message || "Lookup failed" });
  }
});

module.exports = router;
