const jwt  = require("jsonwebtoken");
const { User } = require("../models");

const SECRET = process.env.JWT_SECRET || "nexinv_secret";

// ── Role default permissions ─────────────────────────────────────────────────
const ROLE_PERMS = {
  owner:     { canAdd:true,  canEdit:true,  canDelete:true,  canTx:true,  canManageUsers:true,  canManageDepts:true,  canManageCompany:true,  canManagePermissions:true  },
  admin:     { canAdd:true,  canEdit:true,  canDelete:true,  canTx:true,  canManageUsers:true,  canManageDepts:true,  canManageCompany:true,  canManagePermissions:true  },
  manager:   { canAdd:false, canEdit:false, canDelete:false, canTx:true,  canManageUsers:true,  canManageDepts:true,  canManageCompany:true,  canManagePermissions:false },
  warehouse: { canAdd:false, canEdit:false, canDelete:false, canTx:true,  canManageUsers:false, canManageDepts:false, canManageCompany:false, canManagePermissions:false },
  viewer:    { canAdd:false, canEdit:false, canDelete:false, canTx:false, canManageUsers:false, canManageDepts:false, canManageCompany:false, canManagePermissions:false },
};

/**
 * Merge role defaults with any custom per-user overrides.
 * Owner permissions are immutable — custom overrides are ignored for the owner role.
 */
const resolvePerms = (user) => {
  if (user.role === "owner") return { ...ROLE_PERMS.owner };
  return { ...ROLE_PERMS[user.role], ...(user.permissions || {}) };
};

// ── Middleware: require a valid company-scoped JWT ───────────────────────────
const protect = async (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ message: "No token" });
  try {
    const { id, companyId } = jwt.verify(h.split(" ")[1], SECRET);
    req.user = await User.findById(id).select("-passwordHash");
    if (!req.user?.active) return res.status(401).json({ message: "Unauthorized" });
    // Allow enterprise user to assume a company for this request via token payload
    if (req.user.isEnterprise && !req.user.companyId && companyId) {
      req.user.companyId = companyId;
    }
    req.perms = resolvePerms(req.user);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ── Middleware: require a valid enterprise JWT ───────────────────────────────
const protectEnterprise = async (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ message: "No token" });
  try {
    const { id } = jwt.verify(h.split(" ")[1], SECRET);
    req.user = await User.findById(id).select("-passwordHash");
    if (!req.user?.active || !req.user?.isEnterprise)
      return res.status(403).json({ message: "Enterprise access required" });
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ── Middleware: require a specific permission ────────────────────────────────
const need = (perm) => (req, res, next) =>
  req.perms?.[perm] ? next() : res.status(403).json({ message: `No ${perm} permission` });

module.exports = { ROLE_PERMS, resolvePerms, protect, protectEnterprise, need, SECRET };
