require("dotenv").config();
const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const multer     = require("multer");
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || "nexerp_secret";

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));

// ── Upload setup (memory → Cloudinary) ───────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, f, cb) => f.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Images only")),
});

function uploadToCloudinary(buffer, folder = "nexerp") {
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
const DeptSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameEn: String,
  color: { type: String, default: "#3b82f6" },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const CatSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameEn: String,
  deptId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameEn: String,
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: "" },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin","manager","warehouse","viewer"], default: "viewer" },
  permissions: { type: mongoose.Schema.Types.Mixed, default: null },
  active: { type: Boolean, default: true },
}, { timestamps: true });
UserSchema.methods.checkPass = function(p) { return bcrypt.compare(p, this.passwordHash); };

const ItemSchema = new mongoose.Schema({
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
ItemSchema.index({ name: "text", nameEn: "text", sku: "text", barcode: "text" });

const TxSchema = new mongoose.Schema({
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

const Dept        = mongoose.model("Department", DeptSchema);
const Cat         = mongoose.model("Category",   CatSchema);
const User        = mongoose.model("User",        UserSchema);
const Item        = mongoose.model("Item",        ItemSchema);
const Transaction = mongoose.model("Transaction", TxSchema);

const SettingSchema = new mongoose.Schema({ key:{type:String,required:true,unique:true}, value:mongoose.Schema.Types.Mixed });
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
    const { id } = jwt.verify(h.split(" ")[1], SECRET);
    req.user = await User.findById(id).select("-passwordHash");
    if (!req.user?.active) return res.status(401).json({ message: "Unauthorized" });
    req.perms = resolvePerms(req.user);
    next();
  } catch { res.status(401).json({ message: "Invalid token" }); }
};
const need = p => (req, res, next) => req.perms?.[p] ? next() : res.status(403).json({ message: `No ${p} permission` });

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Missing fields" });
    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user || !user.active || !(await user.checkPass(password)))
      return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: "7d" });
    const perms = resolvePerms(user);
    res.json({ token, user: { id: user._id, name: user.name, nameEn: user.nameEn,
      username: user.username, email: user.email||"", role: user.role, permissions: user.permissions||null, perms } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get("/api/auth/me", protect, (req, res) => {
  const u = req.user.toObject(); delete u.passwordHash;
  res.json({ user: u, perms: req.perms });
});

// ── Departments ───────────────────────────────────────────────────────────────
app.get("/api/departments", protect, async (req, res) => {
  try { res.json(await Dept.find({ active: true }).sort({ name: 1 })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
app.post("/api/departments", protect, need("canManageDepts"), async (req, res) => {
  try { res.status(201).json(await Dept.create(req.body)); }
  catch (e) { res.status(400).json({ message: e.message }); }
});
app.put("/api/departments/:id", protect, need("canManageDepts"), async (req, res) => {
  try { res.json(await Dept.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (e) { res.status(400).json({ message: e.message }); }
});
app.delete("/api/departments/:id", protect, need("canManageDepts"), async (req, res) => {
  try {
    if (await Item.findOne({ deptId: req.params.id }))
      return res.status(400).json({ message: "Department has items" });
    await Dept.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Categories ────────────────────────────────────────────────────────────────
app.get("/api/categories", protect, async (req, res) => {
  try { res.json(await Cat.find({ active: true }).populate("deptId","name nameEn color")); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
app.post("/api/categories", protect, need("canManageDepts"), async (req, res) => {
  try { res.status(201).json(await Cat.create(req.body)); }
  catch (e) { res.status(400).json({ message: e.message }); }
});
app.delete("/api/categories/:id", protect, need("canManageDepts"), async (req, res) => {
  try {
    if (await Item.findOne({ catId: req.params.id }))
      return res.status(400).json({ message: "Category has items" });
    await Cat.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Items ─────────────────────────────────────────────────────────────────────
app.get("/api/items", protect, async (req, res) => {
  try {
    const { search, dept, cat, status, stock } = req.query;
    let q = {};
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
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get("/api/items/barcode/:code", protect, async (req, res) => {
  try { res.json(await Item.findOne({ barcode: req.params.code }) || null); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

app.get("/api/items/:id", protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate("deptId","name nameEn color").populate("catId","name nameEn");
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post("/api/items", protect, need("canAdd"), async (req, res) => {
  try { res.status(201).json(await Item.create(req.body)); }
  catch (e) { res.status(400).json({ message: e.message }); }
});

app.put("/api/items/:id", protect, need("canEdit"), async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate("deptId","name nameEn color").populate("catId","name nameEn");
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete("/api/items/:id", protect, need("canDelete"), async (req, res) => {
  try {
    await Item.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Photo upload → Cloudinary
app.post("/api/items/:id/photo", protect, need("canEdit"), upload.single("photo"), async (req, res) => {
  try {
    const result = await uploadToCloudinary(req.file.buffer);
    const image = { url: result.secure_url, publicId: result.public_id };
    await Item.findByIdAndUpdate(req.params.id, {
      photo: result.secure_url,
      $push: { images: image }
    });
    res.json({ photo: result.secure_url, image });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Add extra image
app.post("/api/items/:id/photos", protect, need("canEdit"), upload.single("photo"), async (req, res) => {
  try {
    const result = await uploadToCloudinary(req.file.buffer);
    const image = { url: result.secure_url, publicId: result.public_id };
    const item = await Item.findByIdAndUpdate(req.params.id, { $push: { images: image } }, { new: true });
    res.json({ image, images: item.images });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Delete image
app.delete("/api/items/:id/photos/:publicId", protect, need("canEdit"), async (req, res) => {
  try {
    const publicId = decodeURIComponent(req.params.publicId);
    try { await cloudinary.uploader.destroy(publicId); } catch {}
    const item = await Item.findByIdAndUpdate(req.params.id,
      { $pull: { images: { publicId } } }, { new: true });
    // If deleted image was the main photo, update photo field
    const stillHas = item.images.find(img => img.publicId === publicId);
    if (!stillHas && item.photo && item.images.length > 0) {
      await Item.findByIdAndUpdate(req.params.id, { photo: item.images[0].url });
    } else if (item.images.length === 0) {
      await Item.findByIdAndUpdate(req.params.id, { photo: "" });
    }
    const updated = await Item.findById(req.params.id);
    res.json({ success: true, images: updated.images, photo: updated.photo });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Transactions ──────────────────────────────────────────────────────────────
app.get("/api/transactions", protect, async (req, res) => {
  try {
    const { item, type, from, to } = req.query;
    let q = {};
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
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post("/api/transactions", protect, need("canTx"), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { type, itemId, qty, source, dest, date, notes } = req.body;
    const item = await Item.findById(itemId).session(session);
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
    res.status(400).json({ message: e.message });
  } finally { session.endSession(); }
});

app.put("/api/transactions/:id", protect, need("canManageUsers"), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tx = await Transaction.findById(req.params.id).session(session);
    if (!tx) throw new Error("Transaction not found");
    const item = await Item.findById(tx.itemId).session(session);
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
    const updated = await Transaction.findByIdAndUpdate(req.params.id, {
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
    res.status(400).json({ message: e.message });
  } finally { session.endSession(); }
});

app.delete("/api/transactions/:id", protect, need("canManageUsers"), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tx = await Transaction.findById(req.params.id).session(session);
    if (!tx) throw new Error("Transaction not found");
    const item = await Item.findById(tx.itemId).session(session);
    if (item) {
      if (tx.type === "IN") item.qty = Math.max(0, item.qty - tx.qty);
      else item.qty += tx.qty;
      await item.save({ session });
    }
    await Transaction.findByIdAndDelete(req.params.id).session(session);
    await session.commitTransaction();
    res.json({ success: true, updatedQty: item?.qty });
  } catch (e) {
    await session.abortTransaction();
    res.status(500).json({ message: e.message });
  } finally { session.endSession(); }
});

// ── Users ─────────────────────────────────────────────────────────────────────
app.get("/api/users", protect, need("canManageUsers"), async (req, res) => {
  try { res.json(await User.find().select("-passwordHash").sort({ createdAt: 1 })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
app.post("/api/users", protect, need("canManageUsers"), async (req, res) => {
  try {
    const { name, nameEn, username, email, password, role, permissions } = req.body;
    if (!name || !username || !password) return res.status(400).json({ message: "Missing fields" });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, nameEn, username: username.toLowerCase().trim(), email: email||"", passwordHash, role, permissions: permissions||null });
    res.status(201).json({ id: user._id, _id: user._id, name: user.name, nameEn: user.nameEn, username: user.username, email: user.email, role: user.role, permissions: user.permissions, active: user.active });
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 400).json({ message: e.code === 11000 ? "Username taken" : e.message });
  }
});
app.put("/api/users/:id", protect, need("canManageUsers"), async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    if (password) rest.passwordHash = await bcrypt.hash(password, 12);
    const user = await User.findByIdAndUpdate(req.params.id, rest, { new: true }).select("-passwordHash");
    res.json(user);
  } catch (e) { res.status(400).json({ message: e.message }); }
});
app.get("/api/users/:id", protect, need("canManageUsers"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
app.delete("/api/users/:id", protect, need("canManageUsers"), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ message: "Cannot delete yourself" });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get("/api/settings", protect, async (req, res) => {
  try {
    const all = await Setting.find();
    const obj = {};
    all.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put("/api/settings", protect, need("canManageUsers"), async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await Setting.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
app.get("/api/stats", protect, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const [totalItems, lowStock, outOfStock, valAgg, todayTx, recentTx] = await Promise.all([
      Item.countDocuments({ status:"active" }),
      Item.countDocuments({ qty:{ $gt:0 }, $expr:{ $lte:["$qty","$minThreshold"] } }),
      Item.countDocuments({ qty:0, status:"active" }),
      Item.aggregate([{ $group:{ _id:null, total:{ $sum:{ $multiply:["$qty","$price"] } } } }]),
      Transaction.countDocuments({ date:{ $gte: today } }),
      Transaction.find().populate("itemId","name nameEn").sort({ date:-1 }).limit(8),
    ]);
    res.json({ totalItems, lowStock, outOfStock,
      totalValue: valAgg[0]?.total || 0, todayTransactions: todayTx, recentTx });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Seed ──────────────────────────────────────────────────────────────────────
async function seedData() {
  const adminExists = await User.findOne({ username: "admin" });
  if (adminExists) { console.log("✅ Data already seeded"); return; }

  const passwordHash = await bcrypt.hash("admin", 12);
  await User.create([
    { name:"مدير النظام",   nameEn:"System Admin",         username:"admin",  passwordHash, role:"admin" },
    { name:"أحمد محمد",     nameEn:"Ahmed Mohamed",        username:"ahmed",  passwordHash: await bcrypt.hash("123",12), role:"manager" },
    { name:"سارة علي",      nameEn:"Sara Ali",             username:"sara",   passwordHash: await bcrypt.hash("123",12), role:"warehouse" },
    { name:"خالد عمر",      nameEn:"Khaled Omar",          username:"khaled", passwordHash: await bcrypt.hash("123",12), role:"viewer" },
  ]);

  const depts = await Dept.create([
    { name:"كهربائي",        nameEn:"Electrical",   color:"#f59e0b" },
    { name:"ميكانيكي",       nameEn:"Mechanical",   color:"#3b82f6" },
    { name:"هيدروليكي",      nameEn:"Hydraulic",    color:"#06b6d4" },
    { name:"تقنية المعلومات",nameEn:"IT",           color:"#8b5cf6" },
    { name:"مواد البناء",    nameEn:"Construction", color:"#f97316" },
  ]);

  const cats = await Cat.create([
    { name:"محركات",    nameEn:"Motors",           deptId: depts[0]._id },
    { name:"كابلات",    nameEn:"Cables",           deptId: depts[0]._id },
    { name:"مضخات",     nameEn:"Pumps",            deptId: depts[1]._id },
    { name:"تروس",      nameEn:"Gears",            deptId: depts[1]._id },
    { name:"صمامات",    nameEn:"Valves",           deptId: depts[2]._id },
    { name:"أجهزة",     nameEn:"Hardware",         deptId: depts[3]._id },
    { name:"أنابيب",    nameEn:"Pipes",            deptId: depts[4]._id },
  ]);

  const items = await Item.create([
    { name:"محرك كهربائي 5HP",   nameEn:"Electric Motor 5HP",     deptId:depts[0]._id, catId:cats[0]._id, sku:"EM-001", barcode:"6221023001001", price:4500,  qty:24,  minThreshold:5,  type:"unit", status:"active", description:"محرك ثلاثي الأوجه للاستخدام الصناعي", photo:"https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop" },
    { name:"مضخة هيدروليكية",    nameEn:"Hydraulic Pump",          deptId:depts[2]._id, catId:cats[4]._id, sku:"HP-002", barcode:"6221023001002", price:8200,  qty:3,   minThreshold:5,  type:"unit", status:"active", description:"مضخة طرد مركزي عالية الضغط", photo:"https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop" },
    { name:"كابل نحاسي 16مم",    nameEn:"Copper Cable 16mm",       deptId:depts[0]._id, catId:cats[1]._id, sku:"CC-003", barcode:"6221023001003", price:85,    qty:800, minThreshold:100,type:"roll", status:"active", description:"كابل طاقة للمتر", photo:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop" },
    { name:"صمام فراشة DN80",    nameEn:"Butterfly Valve DN80",    deptId:depts[2]._id, catId:cats[4]._id, sku:"BV-004", barcode:"6221023001004", price:1800,  qty:0,   minThreshold:10, type:"unit", status:"active", description:"صمام صناعي PN16" },
    { name:"وحدة تخزين 32TB",    nameEn:"NAS Storage 32TB",        deptId:depts[3]._id, catId:cats[5]._id, sku:"NS-005", barcode:"6221023001005", price:35000, qty:4,   minThreshold:2,  type:"unit", status:"active", description:"وحدة تخزين شبكية", photo:"https://images.unsplash.com/photo-1558564030-22c6e6e226a2?w=400&h=300&fit=crop" },
    { name:"علبة تروس صناعية",   nameEn:"Industrial Gearbox",      deptId:depts[1]._id, catId:cats[3]._id, sku:"GB-006", barcode:"6221023001006", price:12000, qty:7,   minThreshold:3,  type:"unit", status:"active", description:"علبة تروس للماكينات الثقيلة" },
  ]);

  console.log("🌱 Demo data seeded successfully");
}

app.get("/api/admin/cloudinary", protect, need("canManageUsers"), async (req, res) => {
  try {
    const usage = await cloudinary.api.usage();
    res.json(usage);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.listen(PORT, () => console.log(`🚀 NexERP API → http://localhost:${PORT}`));
