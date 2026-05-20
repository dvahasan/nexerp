require("dotenv").config();
const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const multer     = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { friendly, statusFor } = require("./errors");
const { sendWelcome }          = require("./mailer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || "nexinv_secret";

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));

// ── Upload setup (memory → Cloudinary) ───────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, f, cb) => f.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Images only")),
});

function uploadToCloudinary(buffer, folder = "nexinv") {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder },
      (err, result) => err ? reject(err) : resolve(result)
    ).end(buffer);
  });
}

// ── MongoDB ───────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => { console.log("✅ MongoDB Atlas connected"); seedData(); })
  .catch(e => console.error("❌ MongoDB error:", e.message));

// ── Schemas ───────────────────────────────────────────────────────────────────
const CompanySchema = new mongoose.Schema({
  code:           { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:           { type: String, required: true },
  description:    { type: String, default: "" },
  industry:       { type: String, default: "" },
  baseCurrency:   { type: String, default: "USD" },
  theme:          { type: String, default: "light" },
  activeIconPack: { type: String, default: "material" },
  primaryColor:   { type: String, default: "#3b82f6" },
  logo:           { type: String, default: "" },
  active:         { type: Boolean, default: true },
}, { timestamps: true });

const DeptSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  name: { type: String, required: true },
  nameEn: String,
  color: { type: String, default: "#3b82f6" },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const CatSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  name: { type: String, required: true },
  nameEn: String,
  deptId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  name: { type: String, required: true },
  nameEn: String,
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: "" },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin","manager","warehouse","viewer"], default: "viewer" },
  permissions: { type: mongoose.Schema.Types.Mixed, default: null },
  preferredLanguage: { type: String, default: "en" },
  isEnterprise: { type: Boolean, default: false },
  ownedCompanies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Company" }],
  active: { type: Boolean, default: true },
}, { timestamps: true });
UserSchema.methods.checkPass = function(p) { return bcrypt.compare(p, this.passwordHash); };

const ItemSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  name: { type: String, required: true },
  nameEn: String,
  description: String,
  deptId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  catId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  sku: { type: String, trim: true },
  barcode: { type: String, trim: true },
  price: { type: Number, default: 0, min: 0 },
  qty: { type: Number, default: 0, min: 0 },
  minThreshold: { type: Number, default: 0 },
  type: { type: String, enum: ["unit","box","pack","group","roll","bag","pallet"], default: "unit" },
  status: { type: String, enum: ["active","inactive","discontinued"], default: "active" },
  datasheet: { type: String, trim: true, default: "" },
  unitsPerPackage: { type: Number, default: 1, min: 1 },
  images: [{ url: String, publicId: String }],
  photo: String,
}, { timestamps: true });
ItemSchema.index({ companyId: 1, name: "text", nameEn: "text", sku: "text", barcode: "text" });

const TxSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  type: { type: String, enum: ["IN","OUT"], required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  qty: { type: Number, required: true, min: 1 },
  source: String,
  dest: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: String,
  date: { type: Date, default: Date.now },
  notes: String,
}, { timestamps: true });

const Company     = mongoose.model("Company",    CompanySchema);

const Dept        = mongoose.model("Department", DeptSchema);
const Cat         = mongoose.model("Category",   CatSchema);
const User        = mongoose.model("User",        UserSchema);
const Item        = mongoose.model("Item",        ItemSchema);
const Transaction = mongoose.model("Transaction", TxSchema);

const SettingSchema = new mongoose.Schema({ companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true }, key:{type:String,required:true}, value:mongoose.Schema.Types.Mixed });
SettingSchema.index({ companyId: 1, key: 1 }, { unique: true });
const Setting = mongoose.model("Setting", SettingSchema);

// ── Permissions ───────────────────────────────────────────────────────────────
const ROLE_PERMS = {
  admin:     { canAdd:true,  canEdit:true,  canDelete:true,  canTx:true,  canManageUsers:true,  canManageDepts:true  },
  manager:   { canAdd:true,  canEdit:true,  canDelete:false, canTx:true,  canManageUsers:false, canManageDepts:true  },
  warehouse: { canAdd:false, canEdit:false, canDelete:false, canTx:true,  canManageUsers:false, canManageDepts:false },
  viewer:    { canAdd:false, canEdit:false, canDelete:false, canTx:false, canManageUsers:false, canManageDepts:false },
};
const resolvePerms = user => ({ ...ROLE_PERMS[user.role], ...(user.permissions||{}) });

// ── Auth middleware ───────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ message: "No token" });
  try {
    const { id, companyId } = jwt.verify(h.split(" ")[1], SECRET);
    req.user = await User.findById(id).select("-passwordHash");
    if (!req.user?.active) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.isEnterprise && !req.user.companyId && companyId) {
       // Temporary assumption of company for this request
       req.user.companyId = companyId;
    }
    req.perms = resolvePerms(req.user);
    next();
  } catch { res.status(401).json({ message: "Invalid token" }); }
};

const protectEnterprise = async (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ message: "No token" });
  try {
    const { id } = jwt.verify(h.split(" ")[1], SECRET);
    req.user = await User.findById(id).select("-passwordHash");
    if (!req.user?.active || !req.user?.isEnterprise) return res.status(403).json({ message: "Enterprise access required" });
    next();
  } catch { res.status(401).json({ message: "Invalid token" }); }
};

const need = p => (req, res, next) => req.perms?.[p] ? next() : res.status(403).json({ message: `No ${p} permission` });

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ── Auth ──────────────────────────────────────────────────────────────────────
const generateCompanyCode = () => 'NEX-' + Math.random().toString(36).substring(2, 6).toUpperCase();

app.post("/api/auth/register", async (req, res) => {
  try {
    const { companyName, adminUsername, adminEmail, password } = req.body;
    if (!companyName || !adminUsername || !password) {
      return res.status(400).json({ message: "Company Name, Username, and Password are required" });
    }

    // Ensure username is globally unique (across all tenants) for simplicity of login if we ever want cross-tenant login,
    // though currently username + companyCode is required. Let's just ensure username is unique within the company.
    // Wait, Company doesn't exist yet. We just need to check if companyName is somewhat unique, or we don't care because code is unique.
    
    // Generate unique code
    let code = generateCompanyCode();
    while (await Company.findOne({ code })) {
      code = generateCompanyCode();
    }

    // Create Company
    const company = await Company.create({
      name: companyName,
      code,
      baseCurrency: "USD",
      theme: "light",
      primaryColor: "#3b82f6"
    });

    // Create Admin User
    const user = await User.create({
      companyId: company._id,
      name: adminUsername,
      username: adminUsername.toLowerCase().trim(),
      email: adminEmail || "",
      passwordHash: await bcrypt.hash(password, 12),
      role: "admin",
      permissions: { canAdd:true, canEdit:true, canDelete:true, canTx:true, canManageUsers:true, canManageDepts:true }
    });

    // Create Default Department and Category
    const dept = await Dept.create({ companyId: company._id, name: "General", nameEn: "General", color: "#3b82f6" });
    await Cat.create({ companyId: company._id, deptId: dept._id, name: "Misc", nameEn: "Misc" });

    // Generate Token
    const token = jwt.sign({ id: user._id, role: user.role, companyId: company._id }, SECRET, { expiresIn: "30d" });

    // Send welcome email (fire-and-forget — never block registration on mail failure)
    sendWelcome({
      to:          adminEmail || "",
      adminName:   adminUsername,
      companyName,
      companyCode: code,
    }).catch(err => console.error("📧 Welcome email failed:", err.message));

    res.json({ token, user: { id: user._id, username: user.username, role: user.role }, companyCode: code });
  } catch (e) {
    res.status(statusFor(e)).json({ message: friendly(e) });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { code, username, password } = req.body;
    // Check if enterprise user login directly via username (no code needed for Enterprise dashboard)
    if (!code) {
      const entUser = await User.findOne({ username: username.toLowerCase(), isEnterprise: true });
      if (!entUser || !await entUser.checkPass(password)) {
        return res.status(401).json({ message: "Invalid enterprise credentials" });
      }
      const token = jwt.sign({ id: entUser._id }, SECRET, { expiresIn: "7d" });
      return res.json({ token, user: entUser, company: null, perms: resolvePerms(entUser) });
    }

    const company = await Company.findOne({ code: code.toUpperCase() });
    if (!company) return res.status(404).json({ message: "Company not found" });
    const user = await User.findOne({ companyId: company._id, username: username.toLowerCase() });
    if (!user || !await user.checkPass(password))
      return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign({ id: user._id, companyId: company._id }, SECRET, { expiresIn: "7d" });
    res.json({ token, user, company, perms: resolvePerms(user) });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

app.get("/api/auth/me", protect, async (req, res) => {
  const u = req.user.toObject(); delete u.passwordHash;
  const company = await Company.findById(u.companyId);
  res.json({ user: u, company, perms: req.perms });
});

// ── Departments ───────────────────────────────────────────────────────────────
app.get("/api/departments", protect, async (req, res) => {
  try { res.json(await Dept.find({ companyId: req.user.companyId, active: true }).sort({ name: 1 })); }
  catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});
app.post("/api/departments", protect, need("canManageDepts"), async (req, res) => {
  try { res.status(201).json(await Dept.create({ ...req.body, companyId: req.user.companyId })); }
  catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});
app.put("/api/departments/:id", protect, need("canManageDepts"), async (req, res) => {
  try { res.json(await Dept.findOneAndUpdate({ _id: req.params.id, companyId: req.user.companyId }, req.body, { new: true })); }
  catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});
app.delete("/api/departments/:id", protect, need("canManageDepts"), async (req, res) => {
  try {
    if (await Item.findOne({ deptId: req.params.id, companyId: req.user.companyId }))
      return res.status(400).json({ message: "Department has items" });
    await Dept.findOneAndUpdate({ _id: req.params.id, companyId: req.user.companyId }, { active: false });
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── Categories ────────────────────────────────────────────────────────────────
app.get("/api/categories", protect, async (req, res) => {
  try { res.json(await Cat.find({ companyId: req.user.companyId, active: true }).populate("deptId","name nameEn color")); }
  catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});
app.post("/api/categories", protect, need("canManageDepts"), async (req, res) => {
  try { res.status(201).json(await Cat.create({ ...req.body, companyId: req.user.companyId })); }
  catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});
app.delete("/api/categories/:id", protect, need("canManageDepts"), async (req, res) => {
  try {
    if (await Item.findOne({ catId: req.params.id, companyId: req.user.companyId }))
      return res.status(400).json({ message: "Category has items" });
    await Cat.findOneAndUpdate({ _id: req.params.id, companyId: req.user.companyId }, { active: false });
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── Items ─────────────────────────────────────────────────────────────────────
app.get("/api/items", protect, async (req, res) => {
  try {
    const { search, dept, cat, status, stock } = req.query;
    let q = { companyId: req.user.companyId };
    if (search) { q.$or = [
      { name: { $regex: search, $options: "i" } },
      { nameEn: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { barcode: { $regex: search, $options: "i" } },
    ]; }
    if (dept)   q.deptId = dept;
    if (cat)    q.catId  = cat;
    if (status) q.status = status;
    if (stock === "out") q.qty = 0;
    if (stock === "low") q.$and = [{ qty: { $gt: 0 } }, { $expr: { $lte: ["$qty","$minThreshold"] } }];
    if (stock === "ok")  q.$expr = { $gt: ["$qty","$minThreshold"] };
    const items = await Item.find(q)
      .populate("deptId","name nameEn color")
      .populate("catId","name nameEn")
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

app.get("/api/items/barcode/:code", protect, async (req, res) => {
  try { res.json(await Item.findOne({ barcode: req.params.code, companyId: req.user.companyId }) || null); }
  catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

app.get("/api/items/:id", protect, async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, companyId: req.user.companyId })
      .populate("deptId","name nameEn color").populate("catId","name nameEn");
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

app.post("/api/items", protect, need("canAdd"), async (req, res) => {
  try { res.status(201).json(await Item.create({ ...req.body, companyId: req.user.companyId })); }
  catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

app.put("/api/items/:id", protect, need("canEdit"), async (req, res) => {
  try {
    const item = await Item.findOneAndUpdate({ _id: req.params.id, companyId: req.user.companyId }, req.body, { new: true, runValidators: true })
      .populate("deptId","name nameEn color").populate("catId","name nameEn");
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

app.delete("/api/items/:id", protect, need("canDelete"), async (req, res) => {
  try {
    await Item.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// Photo upload → Cloudinary
app.post("/api/items/:id/photo", protect, need("canEdit"), upload.single("photo"), async (req, res) => {
  try {
    const result = await uploadToCloudinary(req.file.buffer);
    const image = { url: result.secure_url, publicId: result.public_id };
    await Item.findOneAndUpdate({ _id: req.params.id, companyId: req.user.companyId }, {
      photo: result.secure_url,
      $push: { images: image }
    });
    res.json({ photo: result.secure_url, image });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// Add extra image
app.post("/api/items/:id/photos", protect, need("canEdit"), upload.single("photo"), async (req, res) => {
  try {
    const result = await uploadToCloudinary(req.file.buffer);
    const image = { url: result.secure_url, publicId: result.public_id };
    const item = await Item.findOneAndUpdate({ _id: req.params.id, companyId: req.user.companyId }, { $push: { images: image } }, { new: true });
    res.json({ image, images: item.images });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// Delete image
app.delete("/api/items/:id/photos/:publicId", protect, need("canEdit"), async (req, res) => {
  try {
    const publicId = decodeURIComponent(req.params.publicId);
    try { await cloudinary.uploader.destroy(publicId); } catch {}
    const item = await Item.findOneAndUpdate({ _id: req.params.id, companyId: req.user.companyId },
      { $pull: { images: { publicId } } }, { new: true });
    // If deleted image was the main photo, update photo field
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

// ── Transactions ──────────────────────────────────────────────────────────────
app.get("/api/transactions", protect, async (req, res) => {
  try {
    const { item, type, from, to } = req.query;
    let q = { companyId: req.user.companyId };
    if (item) q.itemId = item;
    if (type) q.type   = type;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to)   q.date.$lte = new Date(to + "T23:59:59");
    }
    const txs = await Transaction.find(q)
      .populate("itemId","name nameEn sku")
      .sort({ date: -1 })
      .limit(500);
    res.json(txs);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

app.post("/api/transactions", protect, need("canTx"), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { type, itemId, qty, source, dest, date, notes } = req.body;
    const item = await Item.findOne({ _id: itemId, companyId: req.user.companyId }).session(session);
    if (!item) throw new Error("Item not found");
    if (type === "OUT" && item.qty < qty)
      throw new Error(`Insufficient stock — available: ${item.qty}`);
    item.qty = type === "IN" ? item.qty + qty : item.qty - qty;
    await item.save({ session });
    const [tx] = await Transaction.create([{
      type, itemId, qty,
      source: type === "IN" ? source : undefined,
      dest:   type === "OUT" ? dest : undefined,
      userId: req.user._id, userName: req.user.name,
      date: date ? new Date(date) : new Date(), notes,
    }], { session });
    await session.commitTransaction();
    res.status(201).json({ transaction: tx, updatedQty: item.qty });
  } catch (e) {
    await session.abortTransaction();
    res.status(statusFor(e)).json({ message: friendly(e) });
  } finally { session.endSession(); }
});

app.put("/api/transactions/:id", protect, need("canManageUsers"), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, companyId: req.user.companyId }).session(session);
    if (!tx) throw new Error("Transaction not found");
    const item = await Item.findOne({ _id: tx.itemId, companyId: req.user.companyId }).session(session);
    if (!item) throw new Error("Item not found");
    // Reverse old effect
    if (tx.type === "IN") item.qty -= tx.qty;
    else item.qty += tx.qty;
    // Apply new effect
    const newQty  = req.body.qty  !== undefined ? +req.body.qty  : tx.qty;
    const newType = req.body.type || tx.type;
    if (newType === "IN") item.qty += newQty;
    else {
      if (item.qty < newQty) throw new Error(`Insufficient stock — available: ${item.qty}`);
      item.qty -= newQty;
    }
    await item.save({ session });
    const updated = await Transaction.findOneAndUpdate({ _id: req.params.id, companyId: req.user.companyId }, {
      qty: newQty, type: newType,
      source: req.body.source !== undefined ? req.body.source : tx.source,
      dest:   req.body.dest   !== undefined ? req.body.dest   : tx.dest,
      date:   req.body.date   ? new Date(req.body.date) : tx.date,
      notes:  req.body.notes  !== undefined ? req.body.notes  : tx.notes,
    }, { new: true, session }).populate("itemId","name nameEn sku");
    await session.commitTransaction();
    res.json({ transaction: updated, updatedQty: item.qty });
  } catch (e) {
    await session.abortTransaction();
    res.status(statusFor(e)).json({ message: friendly(e) });
  } finally { session.endSession(); }
});

app.delete("/api/transactions/:id", protect, need("canManageUsers"), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, companyId: req.user.companyId }).session(session);
    if (!tx) throw new Error("Transaction not found");
    const item = await Item.findOne({ _id: tx.itemId, companyId: req.user.companyId }).session(session);
    if (item) {
      if (tx.type === "IN") item.qty = Math.max(0, item.qty - tx.qty);
      else item.qty += tx.qty;
      await item.save({ session });
    }
    await Transaction.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId }).session(session);
    await session.commitTransaction();
    res.json({ success: true, updatedQty: item?.qty });
  } catch (e) {
    await session.abortTransaction();
    res.status(statusFor(e)).json({ message: friendly(e) });
  } finally { session.endSession(); }
});

// ── Enterprise ────────────────────────────────────────────────────────────────
app.get("/api/enterprise/companies", protectEnterprise, async (req, res) => {
  try {
    const companies = await Company.find({ _id: { $in: req.user.ownedCompanies } });
    res.json(companies);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

app.post("/api/enterprise/assume/:companyId", protectEnterprise, async (req, res) => {
  try {
    const companyId = req.params.companyId;
    if (!req.user.ownedCompanies.includes(companyId)) {
      return res.status(403).json({ message: "You do not own this company" });
    }
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });
    
    // Issue a token specifically for this company context
    const token = jwt.sign({ id: req.user._id, companyId: company._id }, SECRET, { expiresIn: "7d" });
    res.json({ token, user: req.user, company, perms: resolvePerms(req.user) });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

app.post("/api/enterprise/create", async (req, res) => {
  try {
    const { name, username, password, email } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, username, email, passwordHash, role: "admin", isEnterprise: true, ownedCompanies: []
    });
    const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── User Management ───────────────────────────────────────────────────────────
app.put("/api/auth/profile", protect, async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    const update = { name, username: username.toLowerCase().trim(), email };
    if (password) update.passwordHash = await bcrypt.hash(password, 10);
    
    // Check if username is taken by someone else
    const existing = await User.findOne({ username: update.username });
    if (existing && existing._id.toString() !== req.user._id.toString()) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select("-passwordHash");
    res.json(updatedUser);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

app.get("/api/users", protect, need("canManageUsers"), async (req, res) => {
  try { res.json(await User.find({ companyId: req.user.companyId }).select("-passwordHash").sort({ createdAt: 1 })); }
  catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});
app.post("/api/users", protect, need("canManageUsers"), async (req, res) => {
  try {
    const { name, nameEn, username, email, password, role, permissions, preferredLanguage } = req.body;
    if (!name || !username || !password) return res.status(400).json({ message: "Missing fields" });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ companyId: req.user.companyId, name, nameEn, username: username.toLowerCase().trim(), email: email||"", passwordHash, role, permissions: permissions||null, preferredLanguage });
    res.status(201).json({ id: user._id, _id: user._id, name: user.name, nameEn: user.nameEn, username: user.username, email: user.email, role: user.role, permissions: user.permissions, preferredLanguage: user.preferredLanguage, active: user.active });
  } catch (e) {
    res.status(statusFor(e)).json({ message: friendly(e) });
  }
});
app.put("/api/users/:id", protect, need("canManageUsers"), async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    if (password) rest.passwordHash = await bcrypt.hash(password, 12);
    const user = await User.findOneAndUpdate({ _id: req.params.id, companyId: req.user.companyId }, rest, { new: true }).select("-passwordHash");
    res.json(user);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});
app.get("/api/users/:id", protect, need("canManageUsers"), async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, companyId: req.user.companyId }).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});
app.delete("/api/users/:id", protect, need("canManageUsers"), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ message: "Cannot delete yourself" });
    await User.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

app.get("/api/settings", protect, async (req, res) => {
  try {
    const all = await Setting.find({ companyId: req.user.companyId });
    const obj = {};
    all.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

app.put("/api/settings", protect, need("canManageUsers"), async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await Setting.findOneAndUpdate({ companyId: req.user.companyId, key }, { value }, { upsert: true, new: true });
    }
    res.json({ success: true });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── Company ───────────────────────────────────────────────────────────────────
app.put("/api/company", protect, need("canManageUsers"), async (req, res) => {
  try {
    const c = await Company.findByIdAndUpdate(req.user.companyId, req.body, { new: true });
    res.json(c);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

app.post("/api/company/logo", protect, need("canManageUsers"), upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) throw new Error("No file uploaded");
    
    let folder = `nexinv/${req.user.companyId}`;
    if (req.user.isEnterprise) {
      folder = `nexinv/${req.user.username}/${req.user.companyId}`;
    }

    const result = await uploadToCloudinary(req.file.buffer, folder);
    const c = await Company.findByIdAndUpdate(req.user.companyId, { logo: result.secure_url }, { new: true });
    res.json({ success: true, logo: c.logo });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
app.get("/api/stats", protect, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const cid = req.user.companyId;
    const [totalItems, lowStock, outOfStock, valAgg, todayTx, recentTx] = await Promise.all([
      Item.countDocuments({ companyId: cid, status:"active" }),
      Item.countDocuments({ companyId: cid, qty:{ $gt:0 }, $expr:{ $lte:["$qty","$minThreshold"] } }),
      Item.countDocuments({ companyId: cid, qty:0, status:"active" }),
      Item.aggregate([{ $match: { companyId: cid } }, { $group:{ _id:null, total:{ $sum:{ $multiply:["$qty","$price"] } } } }]),
      Transaction.countDocuments({ companyId: cid, date:{ $gte: today } }),
      Transaction.find({ companyId: cid }).populate("itemId","name nameEn").sort({ date:-1 }).limit(8),
    ]);
    res.json({ totalItems, lowStock, outOfStock,
      totalValue: valAgg[0]?.total || 0, todayTransactions: todayTx, recentTx });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── AI Insights ───────────────────────────────────────────────────────────────
app.post("/api/ai/chat", protect, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: "No prompt provided" });
    
    // Check if Gemini API key exists
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ 
        response: "AI integration is simulated because GEMINI_API_KEY is not set. Here is a simulated insight based on your prompt: The stock for 'Electrical' department is running 15% lower than last quarter. Consider restocking soon." 
      });
    }

    const { GoogleGenAI } = require("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Fetch context from user's company
    const cid = req.user.companyId;
    const [items, txs] = await Promise.all([
      Item.find({ companyId: cid }).limit(100),
      Transaction.find({ companyId: cid }).sort({ date: -1 }).limit(50)
    ]);
    
    const context = `Context: Inventory system for company. Current items count: ${items.length}. Recent transactions count: ${txs.length}. User asking: ${prompt}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: context,
    });
    
    res.json({ response: response.text });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── Seed ──────────────────────────────────────────────────────────────────────
async function seedData() {
  const adminExists = await User.findOne({ username: "admin" });
  if (adminExists) { console.log("✅ Data already seeded"); return; }

  console.log("🌱 Seeding default company and admin...");
  const company = await Company.create({
    code: "NEX-01",
    name: "NexINV Default Company",
    baseCurrency: "USD",
    theme: "light",
    activeIconPack: "material",
    primaryColor: "#3b82f6",
  });

  const passwordHash = await bcrypt.hash("admin", 12);
  await User.create([
    { companyId: company._id, name:"مدير النظام",   nameEn:"System Admin",         username:"admin",  passwordHash, role:"admin" },
    { companyId: company._id, name:"أحمد محمد",     nameEn:"Ahmed Mohamed",        username:"ahmed",  passwordHash: await bcrypt.hash("123",12), role:"manager" },
    { companyId: company._id, name:"سارة علي",      nameEn:"Sara Ali",             username:"sara",   passwordHash: await bcrypt.hash("123",12), role:"warehouse" },
    { companyId: company._id, name:"خالد عمر",      nameEn:"Khaled Omar",          username:"khaled", passwordHash: await bcrypt.hash("123",12), role:"viewer" },
  ]);

  const depts = await Dept.create([
    { companyId: company._id, name:"كهربائي",        nameEn:"Electrical",   color:"#f59e0b" },
    { companyId: company._id, name:"ميكانيكي",       nameEn:"Mechanical",   color:"#3b82f6" },
    { companyId: company._id, name:"هيدروليكي",      nameEn:"Hydraulic",    color:"#06b6d4" },
    { companyId: company._id, name:"تقنية المعلومات",nameEn:"IT",           color:"#8b5cf6" },
    { companyId: company._id, name:"مواد البناء",    nameEn:"Construction", color:"#f97316" },
  ]);

  const cats = await Cat.create([
    { companyId: company._id, name:"محركات",    nameEn:"Motors",           deptId: depts[0]._id },
    { companyId: company._id, name:"كابلات",    nameEn:"Cables",           deptId: depts[0]._id },
    { companyId: company._id, name:"مضخات",     nameEn:"Pumps",            deptId: depts[1]._id },
    { companyId: company._id, name:"تروس",      nameEn:"Gears",            deptId: depts[1]._id },
    { companyId: company._id, name:"صمامات",    nameEn:"Valves",           deptId: depts[2]._id },
    { companyId: company._id, name:"أجهزة",     nameEn:"Hardware",         deptId: depts[3]._id },
    { companyId: company._id, name:"أنابيب",    nameEn:"Pipes",            deptId: depts[4]._id },
  ]);

  const items = await Item.create([
    { companyId: company._id, name:"محرك كهربائي 5HP",   nameEn:"Electric Motor 5HP",     deptId:depts[0]._id, catId:cats[0]._id, sku:"EM-001", barcode:"6221023001001", price:4500,  qty:24,  minThreshold:5,  type:"unit", status:"active", description:"محرك ثلاثي الأوجه للاستخدام الصناعي", photo:"https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop" },
    { companyId: company._id, name:"مضخة هيدروليكية",    nameEn:"Hydraulic Pump",          deptId:depts[2]._id, catId:cats[4]._id, sku:"HP-002", barcode:"6221023001002", price:8200,  qty:3,   minThreshold:5,  type:"unit", status:"active", description:"مضخة طرد مركزي عالية الضغط", photo:"https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop" },
    { companyId: company._id, name:"كابل نحاسي 16مم",    nameEn:"Copper Cable 16mm",       deptId:depts[0]._id, catId:cats[1]._id, sku:"CC-003", barcode:"6221023001003", price:85,    qty:800, minThreshold:100,type:"roll", status:"active", description:"كابل طاقة للمتر", photo:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop" },
    { companyId: company._id, name:"صمام فراشة DN80",    nameEn:"Butterfly Valve DN80",    deptId:depts[2]._id, catId:cats[4]._id, sku:"BV-004", barcode:"6221023001004", price:1800,  qty:0,   minThreshold:10, type:"unit", status:"active", description:"صمام صناعي PN16" },
    { companyId: company._id, name:"وحدة تخزين 32TB",    nameEn:"NAS Storage 32TB",        deptId:depts[3]._id, catId:cats[5]._id, sku:"NS-005", barcode:"6221023001005", price:35000, qty:4,   minThreshold:2,  type:"unit", status:"active", description:"وحدة تخزين شبكية", photo:"https://images.unsplash.com/photo-1558564030-22c6e6e226a2?w=400&h=300&fit=crop" },
    { companyId: company._id, name:"علبة تروس صناعية",   nameEn:"Industrial Gearbox",      deptId:depts[1]._id, catId:cats[3]._id, sku:"GB-006", barcode:"6221023001006", price:12000, qty:7,   minThreshold:3,  type:"unit", status:"active", description:"علبة تروس للماكينات الثقيلة" },
  ]);

  console.log("🌱 Demo data seeded successfully");
}

app.get("/api/admin/cloudinary", protect, need("canManageUsers"), async (req, res) => {
  try {
    const usage = await cloudinary.api.usage();
    res.json(usage);
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

app.listen(PORT, () => console.log(`🚀 NexINV API v1.1 → http://localhost:${PORT} | routes: settings, cloudinary, tx-crud`));
