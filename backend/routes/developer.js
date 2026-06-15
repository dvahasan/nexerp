const express = require("express");
const mongoose = require("mongoose");
const os = require("os");
const { User, Company, Transaction, Item } = require("../models");

const router = express.Router();

// Middleware to enforce developer master key
const requireDevKey = (req, res, next) => {
  const masterKey = process.env.DEV_MASTER_KEY || "nexdev2026";
  const providedKey = req.headers["x-dev-key"];
  
  if (!providedKey || providedKey !== masterKey) {
    return res.status(401).json({ message: "Unauthorized: Invalid or missing Developer Key" });
  }
  next();
};

// ── GET /api/dev/stats ────────────────────────────────────────────────────────
router.get("/stats", requireDevKey, async (req, res) => {
  try {
    // 1. App Data Counts
    const [usersCount, companiesCount, txCount, itemsCount] = await Promise.all([
      User.countDocuments(),
      Company.countDocuments(),
      Transaction.countDocuments(),
      Item.countDocuments(),
    ]);

    // 2. Database Stats
    let dbStats = null;
    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        dbStats = await mongoose.connection.db.stats();
      }
    } catch (dbErr) {
      console.warn("Failed to fetch DB stats", dbErr);
    }

    // 3. Server Node OS Stats
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const uptime = os.uptime();
    
    // CPU load average over 1, 5, and 15 mins (if supported by OS)
    const loadAvg = os.loadavg();

    res.json({
      success: true,
      data: {
        counts: {
          users: usersCount,
          companies: companiesCount,
          transactions: txCount,
          items: itemsCount,
        },
        database: dbStats ? {
          dbSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          objects: dbStats.objects,
          indexes: dbStats.indexes,
        } : null,
        server: {
          uptimeSeconds: uptime,
          memory: {
            total: totalMem,
            used: usedMem,
            free: freeMem,
          },
          loadAvg,
          platform: os.platform(),
          nodeVersion: process.version,
        }
      }
    });
  } catch (error) {
    console.error("Developer Stats Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

// ── GET /api/dev/details ──────────────────────────────────────────────────────
router.get("/details", requireDevKey, async (req, res) => {
  try {
    const { DemoVisit, BomTemplate, BomProduction } = require("../models");

    // Fetch arrays of detailed data
    const [companies, users, enterpriseUsers, bomTemplates, bomProductions, demoVisits] = await Promise.all([
      Company.find().select('name code industry theme liveSync createdAt').sort({ createdAt: -1 }).limit(50),
      User.find().select('username name role email isEnterprise active createdAt').sort({ createdAt: -1 }).limit(50),
      User.find({ isEnterprise: true }).select('username name email createdAt'),
      BomTemplate.countDocuments(),
      BomProduction.find().select('qtyProduced notes createdAt').sort({ createdAt: -1 }).limit(20),
      DemoVisit.find().sort({ createdAt: -1 }).limit(50)
    ]);

    res.json({
      success: true,
      data: {
        workspaces: companies,
        personnel: users,
        enterprise: enterpriseUsers,
        bom: {
          totalTemplates: bomTemplates,
          recentProductions: bomProductions
        },
        demoTraffic: demoVisits
      }
    });
  } catch (error) {
    console.error("Developer Details Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

// ── POST /api/dev/track-demo ──────────────────────────────────────────────────
router.post("/track-demo", async (req, res) => {
  try {
    const { DemoVisit } = require("../models");
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || "";
    if (ip.includes(',')) ip = ip.split(',')[0].trim();
    
    // Attempt to get location using free IP API
    let country = "Unknown", city = "Unknown";
    try {
      if (ip && ip !== "127.0.0.1" && ip !== "::1") {
        const ipRes = await fetch(`http://ip-api.com/json/${ip}`);
        const ipData = await ipRes.json();
        if (ipData.status === "success") {
          country = ipData.country;
          city = ipData.city;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch IP geolocation:", err.message);
    }

    const visit = new DemoVisit({
      ip,
      country,
      city,
      location: country !== "Unknown" ? `${city}, ${country}` : "Local/Unknown",
      userAgent: req.headers['user-agent'] || "Unknown",
      type: req.body?.type || "standard"
    });

    await visit.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Demo Tracking Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ── UNIVERSAL DATABASE EXPLORER (CRUD) ───────────────────────────────────────

// 1. Get all available models
router.get("/db/models", requireDevKey, (req, res) => {
  const models = require("../models");
  res.json({ success: true, data: Object.keys(models) });
});

// 2. Query documents for a specific model
router.post("/db/query/:model", requireDevKey, async (req, res) => {
  try {
    const models = require("../models");
    const Model = models[req.params.model];
    if (!Model) return res.status(404).json({ message: "Model not found" });

    const query = req.body.query || {};
    const limit = parseInt(req.body.limit) || 50;
    const skip = parseInt(req.body.skip) || 0;

    const docs = await Model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const total = await Model.countDocuments(query);

    res.json({ success: true, data: { docs, total, limit, skip } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Create a new document
router.post("/db/:model", requireDevKey, async (req, res) => {
  try {
    const models = require("../models");
    const Model = models[req.params.model];
    if (!Model) return res.status(404).json({ message: "Model not found" });

    const doc = new Model(req.body);
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. Update an existing document
router.put("/db/:model/:id", requireDevKey, async (req, res) => {
  try {
    const models = require("../models");
    const Model = models[req.params.model];
    if (!Model) return res.status(404).json({ message: "Model not found" });

    // Ensure we don't accidentally overwrite the _id
    const payload = { ...req.body };
    delete payload._id;

    const doc = await Model.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: false }).lean();
    if (!doc) return res.status(404).json({ message: "Document not found" });

    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. Delete a document
router.delete("/db/:model/:id", requireDevKey, async (req, res) => {
  try {
    const models = require("../models");
    const Model = models[req.params.model];
    if (!Model) return res.status(404).json({ message: "Model not found" });

    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── ACTION LOGS & AUDIT TRAIL ────────────────────────────────────────────────

router.get("/action-logs", requireDevKey, async (req, res) => {
  try {
    const { ActionLog, User, Company } = require("../models");
    const limit = parseInt(req.query.limit) || 100;
    
    const logs = await ActionLog.find()
      .populate('userId', 'username name')
      .populate('companyId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
      
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── SYSTEM CONFIGURATIONS & SETTINGS ──────────────────────────────────────────

router.get("/settings", requireDevKey, async (req, res) => {
  try {
    const { Setting, Company } = require("../models");
    const settings = await Setting.find().populate('companyId', 'name code').lean();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/settings", requireDevKey, async (req, res) => {
  try {
    const { Setting } = require("../models");
    const { companyId, key, value } = req.body;
    
    const setting = await Setting.findOneAndUpdate(
      { companyId, key },
      { value },
      { new: true, upsert: true }
    );
    
    res.json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/settings/:id", requireDevKey, async (req, res) => {
  try {
    const { Setting } = require("../models");
    await Setting.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Setting deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── PERSONNEL MANAGEMENT ──────────────────────────────────────────────────────

router.post("/personnel/toggle-active/:id", requireDevKey, async (req, res) => {
  try {
    const { User } = require("../models");
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    user.active = !user.active;
    await user.save();
    
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
