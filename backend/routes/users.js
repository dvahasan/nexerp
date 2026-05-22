const express = require("express");
const bcrypt  = require("bcryptjs");
const { User }                 = require("../models");
const { protect, need }        = require("../middleware/auth");
const { broadcast }            = require("../utils/broadcast");
const { friendly, statusFor }  = require("../errors");

const router = express.Router();

// ── GET /api/users ───────────────────────────────────────────────────────────
// Without ?page → full list (used by context / dropdowns).
// With ?page=N  → paginated (used by Users.jsx infinite scroll).
router.get("/", protect, need("canManageUsers"), async (req, res) => {
  try {
    const { page: rawPage, limit: rawLimit, search, role, roles } = req.query;
    
    let combinedQuery;
    let roleList = roles ? roles.split(',') : (role ? [role] : []);
    
    if (roleList.length > 0) {
      let conditions = [];
      const hasEnterprise = roleList.includes('enterprise_owner');
      const normalRoles = roleList.filter(r => r !== 'enterprise_owner');
      
      if (hasEnterprise) {
        conditions.push({ isEnterprise: true, ownedCompanies: req.user.companyId });
      }
      if (normalRoles.length > 0) {
        conditions.push({ companyId: req.user.companyId, role: { $in: normalRoles } });
      }
      
      if (conditions.length === 1) {
        combinedQuery = conditions[0];
      } else {
        combinedQuery = { $or: conditions };
      }
    } else {
      combinedQuery = {
        $or: [
          { companyId: req.user.companyId },
          { isEnterprise: true, ownedCompanies: req.user.companyId }
        ]
      };
    }

    if (search) {
      const searchQ = {
        $or: [
          { name:     { $regex: search, $options: "i" } },
          { username: { $regex: search, $options: "i" } },
          { email:    { $regex: search, $options: "i" } },
        ]
      };
      if (combinedQuery.$or) {
        combinedQuery = { $and: [combinedQuery, searchQ] };
      } else {
        combinedQuery = { ...combinedQuery, ...searchQ };
      }
    }

    if (!rawPage) {
      const users = await User.find(combinedQuery).select("-passwordHash").sort({ createdAt: 1 });
      return res.json(users);
    }

    const pg    = Math.max(1, parseInt(rawPage) || 1);
    const limit = Math.min(50, parseInt(rawLimit) || 12);
    const skip  = (pg - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(combinedQuery).select("-passwordHash").sort({ createdAt: 1 }).skip(skip).limit(limit),
      User.countDocuments(combinedQuery),
    ]);
    res.json({ users, total, page: pg, pages: Math.ceil(total / limit) });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/users ───────────────────────────────────────────────────────────
router.post("/", protect, need("canManageUsers"), async (req, res) => {
  try {
    const { name, nameEn, username, email, password, role, permissions, preferredLanguage } = req.body;
    if (!name || !username || !password)
      return res.status(400).json({ message: "Missing fields" });

    const passwordHash = await bcrypt.hash(password, 12);
    let safeRole  = role;
    let safePerms = permissions || null;
    if (!req.perms.canManagePermissions) {
      safeRole  = "viewer";
      safePerms = null;
    }

    const user = await User.create({
      companyId: req.user.companyId, name, nameEn,
      username: username.toLowerCase().trim(),
      email: email || "", passwordHash,
      role: safeRole, permissions: safePerms, preferredLanguage,
    });

    const doc = {
      id: user._id, _id: user._id,
      name: user.name, nameEn: user.nameEn,
      username: user.username, email: user.email,
      role: user.role, permissions: user.permissions,
      preferredLanguage: user.preferredLanguage, active: user.active,
    };
    broadcast(req, "user_added", doc);
    res.status(201).json(doc);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── GET /api/users/:id ────────────────────────────────────────────────────────
router.get("/:id", protect, need("canManageUsers"), async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, companyId: req.user.companyId }).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
router.put("/:id", protect, need("canManageUsers"), async (req, res) => {
  try {
    const target = await User.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role === "owner") return res.status(403).json({ message: "The owner account cannot be modified" });

    const { password, ...rest } = req.body;
    if (password) rest.passwordHash = await bcrypt.hash(password, 12);
    if (rest.role === "owner") delete rest.role; // Never promote to owner via API
    if (!req.perms.canManagePermissions) {
      delete rest.role;
      delete rest.permissions;
    }

    console.log(`✏️  PUT /users/${req.params.id} by [${req.user.username}] →`, JSON.stringify(rest).slice(0, 200));

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { $set: rest },
      { returnDocument: "after", runValidators: false }
    ).select("-passwordHash");

    if (!user) {
      console.log(`❌  User ${req.params.id} not found in company ${req.user.companyId}`);
      return res.status(404).json({ message: "User not found" });
    }
    console.log(`✅  User updated → permissions:`, JSON.stringify(user.permissions));
    broadcast(req, "user_updated", user);
    res.json(user);
  } catch (e) {
    console.error(`❌  PUT /users error:`, e.message);
    res.status(statusFor(e)).json({ message: friendly(e) });
  }
});

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
router.delete("/:id", protect, need("canManageUsers"), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ message: "Cannot delete yourself" });
    const target = await User.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role === "owner") return res.status(403).json({ message: "The owner account cannot be deleted" });
    await User.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

module.exports = router;
