const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { Company, User, Department, Category } = require("../models");
const { protect, resolvePerms, SECRET } = require("../middleware/auth");
const { friendly, statusFor } = require("../errors");
const { sendWelcome }          = require("../mailer");

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────
const generateCompanyCode = () =>
  "NEX-" + Math.random().toString(36).substring(2, 6).toUpperCase();

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { companyName, adminUsername, adminEmail, password, isEnterprise } = req.body;
    console.log("Register payload:", req.body);

    // ── Enterprise registration (no company needed) ──────────────────────────
    if (isEnterprise) {
      if (!adminUsername || !password)
        return res.status(400).json({ message: "Username and Password are required for Enterprise account" });

      const user = await User.create({
        name:         adminUsername,
        username:     adminUsername.toLowerCase().trim(),
        email:        adminEmail || "",
        passwordHash: await bcrypt.hash(password, 12),
        role:         "owner",
        permissions:  {},
        isEnterprise: true,
        ownedCompanies: [],
      });

      const token = jwt.sign({ id: user._id, isEnterprise: true }, SECRET, { expiresIn: "30d" });
      return res.status(201).json({ token, isEnterprise: true });
    }

    // ── Standard company registration ────────────────────────────────────────
    if (!companyName || !adminUsername || !password)
      return res.status(400).json({ message: "Company Name, Username, and Password are required" });

    // Generate unique code
    let code = generateCompanyCode();
    while (await Company.findOne({ code })) code = generateCompanyCode();

    const company = await Company.create({
      name: companyName, code, baseCurrency: "USD", theme: "light", primaryColor: "#3b82f6",
    });

    const user = await User.create({
      companyId:    company._id,
      name:         adminUsername,
      username:     adminUsername.toLowerCase().trim(),
      email:        adminEmail || "",
      passwordHash: await bcrypt.hash(password, 12),
      role:         "owner",
      permissions:  {},
    });

    // Default department + category
    const dept = await Department.create({ companyId: company._id, name: "General", nameEn: "General", color: "#3b82f6" });
    await Category.create({ companyId: company._id, deptId: dept._id, name: "Misc", nameEn: "Misc" });

    const token = jwt.sign({ id: user._id, role: user.role, companyId: company._id }, SECRET, { expiresIn: "30d" });

    // Welcome email — fire-and-forget
    sendWelcome({ to: adminEmail || "", adminName: adminUsername, companyName, companyCode: code })
      .catch(err => console.error("📧 Welcome email failed:", err.message));

    res.json({ token, user: { id: user._id, username: user.username, role: user.role }, companyCode: code });
  } catch (e) {
    res.status(statusFor(e)).json({ message: friendly(e) });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { code, username, password } = req.body;
    if (!username?.trim() || !password?.trim())
      return res.status(400).json({ message: "Missing fields" });

    // Enterprise login (no company code)
    if (!code) {
      const entUser = await User.findOne({ username: username.toLowerCase(), isEnterprise: true });
      if (!entUser || !(await entUser.checkPass(password)))
        return res.status(401).json({ message: "Invalid enterprise credentials" });
      const token = jwt.sign({ id: entUser._id }, SECRET, { expiresIn: "7d" });
      return res.json({ token, user: entUser, company: null, perms: resolvePerms(entUser) });
    }

    // Company login
    const company = await Company.findOne({ code: code.toUpperCase() });
    if (!company) return res.status(404).json({ message: "Company not found" });

    const user = await User.findOne({ companyId: company._id, username: username.toLowerCase() });
    if (!user || !(await user.checkPass(password)))
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, companyId: company._id }, SECRET, { expiresIn: "7d" });
    res.json({ token, user, company, perms: resolvePerms(user) });
  } catch (e) {
    res.status(statusFor(e)).json({ message: friendly(e) });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", protect, async (req, res) => {
  const u = req.user.toObject();
  delete u.passwordHash;
  const company = await Company.findById(u.companyId);
  res.json({ user: u, company, perms: req.perms });
});

// ── PUT /api/auth/profile ────────────────────────────────────────────────────
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, username, email, phone, password, preferredLanguage } = req.body;
    const update = { name, username: username.toLowerCase().trim(), email, phone };
    if (password) update.passwordHash = await bcrypt.hash(password, 10);
    if (preferredLanguage) update.preferredLanguage = preferredLanguage;

    // Guard: username taken by someone else in the same company
    const existing = await User.findOne({ companyId: req.user.companyId, username: update.username });
    if (existing && existing._id.toString() !== req.user._id.toString())
      return res.status(400).json({ message: "Username already taken" });

    const updatedUser = await User.findByIdAndUpdate(req.user._id, update, { returnDocument: "after" })
      .select("-passwordHash");
    res.json(updatedUser);
  } catch (e) {
    res.status(statusFor(e)).json({ message: friendly(e) });
  }
});

module.exports = router;
