const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { Company, User, Department, Category, Item, Transaction, File } = require("../models");
const { protectEnterprise, resolvePerms, SECRET } = require("../middleware/auth");
const { friendly, statusFor } = require("../errors");

const router = express.Router();

const generateCompanyCode = () =>
  "NEX-" + Math.random().toString(36).substring(2, 6).toUpperCase();

// ── GET /api/enterprise/companies ────────────────────────────────────────────
router.get("/companies", protectEnterprise, async (req, res) => {
  try {
    const companies = await Company.find({ _id: { $in: req.user.ownedCompanies } }).lean();

    const populated = await Promise.all(
      companies.map(async (c) => {
        const [users, items, txs, filesCount] = await Promise.all([
          User.find({ companyId: c._id }).select("active"),
          Item.find({ companyId: c._id }).select("qty price minThreshold"),
          Transaction.find({ companyId: c._id }).select("type"),
          File.countDocuments({ companyId: c._id }),
        ]);

        const stockValue = items.reduce((acc, it) => acc + (it.qty * (it.price || 0)), 0);
        const alerts     = items.filter(it => it.qty <= (it.minThreshold || 0)).length;

        return {
          ...c,
          stats: {
            employees:     users.length,
            activeMembers: users.filter(u => u.active).length,
            itemsCount:    items.length,
            stockValue, alerts,
            txIn:          txs.filter(t => t.type === "IN").length,
            txOut:         txs.filter(t => t.type === "OUT").length,
            filesCount,
          },
        };
      })
    );

    res.json(populated);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/enterprise/companies ───────────────────────────────────────────
router.post("/companies", protectEnterprise, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Company name is required" });

    let code = generateCompanyCode();
    while (await Company.findOne({ code })) code = generateCompanyCode();

    const company = await Company.create({
      name: name.trim(), code, baseCurrency: "USD", theme: "light", primaryColor: "#3b82f6",
    });

    const dept = await Department.create({ companyId: company._id, name: "General", nameEn: "General", color: "#3b82f6" });
    await Category.create({ companyId: company._id, deptId: dept._id, name: "Misc", nameEn: "Misc" });

    req.user.ownedCompanies.push(company._id);
    await req.user.save();

    res.status(201).json(company);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/enterprise/assume/:companyId ───────────────────────────────────
router.post("/assume/:companyId", protectEnterprise, async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!req.user.ownedCompanies.includes(companyId))
      return res.status(403).json({ message: "You do not own this company" });

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    const token = jwt.sign({ id: req.user._id, companyId: company._id }, SECRET, { expiresIn: "7d" });
    res.json({ token, user: req.user, company, perms: resolvePerms(req.user) });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/enterprise/exit ────────────────────────────────────────────────
router.post("/exit", protectEnterprise, async (req, res) => {
  try {
    const token = jwt.sign({ id: req.user._id, isEnterprise: true }, SECRET, { expiresIn: "7d" });
    res.json({ token, isEnterprise: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/enterprise/create ──────────────────────────────────────────────
router.post("/create", async (req, res) => {
  try {
    const { name, username, password, email } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, username, email, passwordHash, role: "admin", isEnterprise: true, ownedCompanies: [],
    });
    const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
