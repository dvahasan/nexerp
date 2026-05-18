/**
 * seed-test-data.js
 * Adds 10 test items (varied types, stock levels, datasheets) plus
 * realistic transactions to NexERP.  Safe to run multiple times —
 * skips items whose SKU already exists.
 *
 * Usage:  node seed-test-data.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

// ── Minimal schemas (mirrors server.js) ──────────────────────────────────────
const DeptSchema = new mongoose.Schema({ name:String, nameEn:String, color:String });
const CatSchema  = new mongoose.Schema({ name:String, nameEn:String, deptId:mongoose.Schema.Types.ObjectId });
const UserSchema = new mongoose.Schema({ name:String, nameEn:String, username:String, role:String }, { timestamps:true });
const ItemSchema = new mongoose.Schema({
  name:String, nameEn:String, description:String,
  deptId:mongoose.Schema.Types.ObjectId, catId:mongoose.Schema.Types.ObjectId,
  sku:{ type:String, unique:true, sparse:true }, barcode:String,
  price:{ type:Number, default:0 },
  qty:{ type:Number, default:0 },
  minThreshold:{ type:Number, default:10 },
  type:{ type:String, default:"unit" },
  status:{ type:String, default:"active" },
  photo:{ type:String, default:"" },
  datasheet:{ type:String, default:"" },
  unitsPerPackage:{ type:Number, default:1 },
  images:[{ url:String, publicId:String }],
}, { timestamps:true });
const TxSchema = new mongoose.Schema({
  type:{ type:String, required:true },
  itemId:{ type:mongoose.Schema.Types.ObjectId, required:true },
  qty:{ type:Number, required:true },
  source:String, dest:String,
  userId:{ type:mongoose.Schema.Types.ObjectId, required:true },
  userName:String, date:{ type:Date, default:Date.now }, notes:String,
}, { timestamps:true });

const Dept = mongoose.model("Department", DeptSchema);
const Cat  = mongoose.model("Category",   CatSchema);
const User = mongoose.model("User",       UserSchema);
const Item = mongoose.model("Item",       ItemSchema);
const Tx   = mongoose.model("Transaction",TxSchema);

const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB\n");

  // ── Resolve existing users / depts / cats ────────────────────────────────
  const users = await User.find();
  if (!users.length) {
    console.error("❌ No users found — start the app once to seed the admin user, then re-run this script.");
    process.exit(1);
  }
  const admin     = users.find(u => u.role === "admin")     || users[0];
  const manager   = users.find(u => u.role === "manager")   || users[0];
  const warehouse = users.find(u => u.role === "warehouse") || users[0];
  const adminName     = admin.nameEn     || admin.name     || "Admin";
  const managerName   = manager.nameEn   || manager.name   || "Manager";
  const warehouseName = warehouse.nameEn || warehouse.name || "Warehouse";

  const depts = await Dept.find();
  const cats  = await Cat.find();
  if (!depts.length) {
    console.error("❌ No departments found — start the app once to seed departments, then re-run.");
    process.exit(1);
  }

  const dElec  = depts.find(d => d.nameEn === "Electrical")   || depts[0];
  const dMech  = depts.find(d => d.nameEn === "Mechanical")   || depts[1] || depts[0];
  const dHydro = depts.find(d => d.nameEn === "Hydraulic")    || depts[2] || depts[0];
  const dIT    = depts.find(d => d.nameEn === "IT")           || depts[3] || depts[0];
  const dConst = depts.find(d => d.nameEn === "Construction") || depts[4] || depts[0];

  const cMotors = cats.find(c => c.nameEn === "Motors")   || cats[0];
  const cCables = cats.find(c => c.nameEn === "Cables")   || cats[1] || cats[0];
  const cGears  = cats.find(c => c.nameEn === "Gears")    || cats[3] || cats[0];
  const cValves = cats.find(c => c.nameEn === "Valves")   || cats[4] || cats[0];
  const cHW     = cats.find(c => c.nameEn === "Hardware") || cats[5] || cats[0];
  const cPipes  = cats.find(c => c.nameEn === "Pipes")    || cats[6] || cats[0];

  // ── 10 item definitions ───────────────────────────────────────────────────
  const itemDefs = [
    // 1 — Normal healthy stock · unit · with datasheet
    {
      name:"بريكر 3-فاز 100A", nameEn:"3-Phase Circuit Breaker 100A",
      deptId:dElec._id, catId:cMotors._id, sku:"CB-T001", barcode:"6221099001001",
      price:1250, qty:30, minThreshold:8, type:"unit", status:"active",
      datasheet:"DS-CB-100A-v3",
      description:"قاطع حماية كهربائي ثلاثي الأطوار 100A",
      photo:"https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop",
    },
    // 2 — LOW stock (qty ≤ minThreshold) · with datasheet
    {
      name:"صمام تحكم DN50 PN16", nameEn:"Control Valve DN50 PN16",
      deptId:dHydro._id, catId:cValves._id, sku:"CV-T002", barcode:"6221099001002",
      price:3400, qty:4, minThreshold:5, type:"unit", status:"active",
      datasheet:"DS-CV-DN50-2024",
      description:"صمام تحكم هيدروليكي مع مشغّل كهربائي",
    },
    // 3 — OUT OF STOCK
    {
      name:"تعرج مرن DN100", nameEn:"Flexible Coupling DN100",
      deptId:dMech._id, catId:cGears._id, sku:"FC-T003", barcode:"6221099001003",
      price:780, qty:0, minThreshold:6, type:"unit", status:"active",
      description:"وصلة مرنة لربط الماكينات",
    },
    // 4 — Box type · unitsPerPackage
    {
      name:"براغي M12×50 ستانلس", nameEn:"Stainless Bolts M12×50",
      deptId:dMech._id, catId:cGears._id, sku:"SB-T004", barcode:"6221099001004",
      price:95, qty:400, minThreshold:100, type:"box", unitsPerPackage:50, status:"active",
      description:"براغي ستانلس ستيل 316 — صندوق 50 حبة",
    },
    // 5 — Pack type · high turnover
    {
      name:"صمام أحادي الاتجاه 1 بوصة", nameEn:"Check Valve 1 inch",
      deptId:dHydro._id, catId:cValves._id, sku:"CHK-T005", barcode:"6221099001005",
      price:320, qty:60, minThreshold:20, type:"pack", unitsPerPackage:10, status:"active",
      description:"حزمة 10 صمامات أحادية الاتجاه بوصة واحدة",
    },
    // 6 — Roll type (cable)
    {
      name:"كابل تحكم 4×1.5مم", nameEn:"Control Cable 4×1.5mm",
      deptId:dElec._id, catId:cCables._id, sku:"CCT-T006", barcode:"6221099001006",
      price:28, qty:2000, minThreshold:200, type:"roll", status:"active",
      description:"كابل تحكم لأجهزة الأتمتة — السعر للمتر",
      photo:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
    },
    // 7 — High-value IT item · with datasheet
    {
      name:"مفتاح شبكة 24 منفذ", nameEn:"Network Switch 24-Port",
      deptId:dIT._id, catId:cHW._id, sku:"NSW-T007", barcode:"6221099001007",
      price:18500, qty:5, minThreshold:2, type:"unit", status:"active",
      datasheet:"DS-NSW-24P-GBE",
      description:"مفتاح شبكة جيجابت 24 منفذ مُدار",
      photo:"https://images.unsplash.com/photo-1558564030-22c6e6e226a2?w=400&h=300&fit=crop",
    },
    // 8 — Bag type (construction consumables) · unitsPerPackage
    {
      name:"شنطة توصيلات خرطوم", nameEn:"Hose Fitting Kit",
      deptId:dConst._id, catId:cPipes._id, sku:"HFK-T008", barcode:"6221099001008",
      price:145, qty:200, minThreshold:50, type:"bag", unitsPerPackage:20, status:"active",
      description:"طقم توصيلات خرطوم مطاطي — شنطة 20 قطعة",
    },
    // 9 — Discontinued item · low remnant
    {
      name:"محرك DC تناظري 2HP", nameEn:"DC Analog Motor 2HP",
      deptId:dElec._id, catId:cMotors._id, sku:"DCM-T009", barcode:"6221099001009",
      price:2100, qty:2, minThreshold:2, type:"unit", status:"discontinued",
      description:"محرك تيار مستمر تناظري — متوقف الإنتاج",
    },
    // 10 — Pallet type · bulk pipes
    {
      name:"أنبوب GI 2 بوصة مجلفن", nameEn:"GI Pipe 2 inch Galvanized",
      deptId:dConst._id, catId:cPipes._id, sku:"GIP-T010", barcode:"6221099001010",
      price:210, qty:150, minThreshold:30, type:"pallet", unitsPerPackage:25, status:"active",
      description:"أنابيب مجلفنة 6 متر — منصة 25 أنبوب",
      photo:"https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop",
    },
  ];

  // ── Create / skip items ───────────────────────────────────────────────────
  const created = [];
  for (const def of itemDefs) {
    const existing = await Item.findOne({ sku: def.sku });
    if (existing) {
      console.log(`⏭  Skip (exists): ${def.sku}  —  ${def.nameEn}`);
      created.push(existing);
    } else {
      const item = await Item.create(def);
      console.log(`✅ Item created:   ${item.sku}  —  ${item.nameEn}`);
      created.push(item);
    }
  }

  // ── Transaction sets ─────────────────────────────────────────────────────
  // Each set is an array of {type,qty,source?,dest?,date,notes?,userId,userName}
  const txSets = [
    // 1 — CB-T001: 5 txs → net qty = 50 - 10 + 15 - 8 - 17 = 30 ✓
    [
      { type:"IN",  qty:50, source:"مورد الكهرباء العام",  date:daysAgo(45), notes:"دفعة استيراد أولى",         userId:admin._id,     userName:adminName },
      { type:"OUT", qty:10, dest:"مشروع المصنع أ",         date:daysAgo(30), notes:"صرف للصيانة الدورية",       userId:warehouse._id, userName:warehouseName },
      { type:"IN",  qty:15, source:"مورد الكهرباء العام",  date:daysAgo(20), notes:"إعادة تخزين",               userId:manager._id,   userName:managerName },
      { type:"OUT", qty:8,  dest:"مشروع التوسعة ب",        date:daysAgo(10), notes:"تركيب لوحة توزيع جديدة",    userId:warehouse._id, userName:warehouseName },
      { type:"OUT", qty:17, dest:"الورشة المركزية",         date:daysAgo(3),  notes:"استبدال عطل",               userId:warehouse._id, userName:warehouseName },
    ],
    // 2 — CV-T002: 4 txs → net = 20 - 5 - 8 - 3 = 4 ✓
    [
      { type:"IN",  qty:20, source:"مورد الصمامات",         date:daysAgo(60), notes:"مشتريات ربع سنوية",         userId:admin._id,     userName:adminName },
      { type:"OUT", qty:5,  dest:"محطة ضخ الشمال",         date:daysAgo(40),                                     userId:warehouse._id, userName:warehouseName },
      { type:"OUT", qty:8,  dest:"خط الإنتاج 3",            date:daysAgo(15), notes:"تركيب جديد",                userId:warehouse._id, userName:warehouseName },
      { type:"OUT", qty:3,  dest:"الصيانة الطارئة",         date:daysAgo(2),  notes:"عطل مفاجئ",                 userId:manager._id,   userName:managerName },
    ],
    // 3 — FC-T003: 3 txs → net = 15 - 9 - 6 = 0 ✓
    [
      { type:"IN",  qty:15, source:"مورد الميكانيكا",       date:daysAgo(90),                                     userId:admin._id,     userName:adminName },
      { type:"OUT", qty:9,  dest:"خط التجميع",              date:daysAgo(50),                                     userId:warehouse._id, userName:warehouseName },
      { type:"OUT", qty:6,  dest:"مشروع التطوير",           date:daysAgo(25), notes:"آخر المخزون",               userId:manager._id,   userName:managerName },
    ],
    // 4 — SB-T004: 4 txs → net = 500 - 50 - 30 - 20 = 400 ✓
    [
      { type:"IN",  qty:500, source:"مصنع المسامير الوطني", date:daysAgo(55), notes:"500 حبة (10 صناديق)",       userId:admin._id,     userName:adminName },
      { type:"OUT", qty:50,  dest:"ورشة التشغيل",           date:daysAgo(35),                                     userId:warehouse._id, userName:warehouseName },
      { type:"OUT", qty:30,  dest:"مشروع الصهاريج",         date:daysAgo(18),                                     userId:warehouse._id, userName:warehouseName },
      { type:"OUT", qty:20,  dest:"الصيانة الشهرية",        date:daysAgo(5),                                      userId:manager._id,   userName:managerName },
    ],
    // 5 — CHK-T005: 5 txs → net = 100 - 20 + 30 - 30 - 20 = 60 ✓
    [
      { type:"IN",  qty:100, source:"مورد الهيدروليك",      date:daysAgo(70), notes:"100 صمام (10 حزم)",          userId:admin._id,     userName:adminName },
      { type:"OUT", qty:20,  dest:"محطة المعالجة",          date:daysAgo(50),                                     userId:warehouse._id, userName:warehouseName },
      { type:"IN",  qty:30,  source:"مورد الهيدروليك",      date:daysAgo(30), notes:"طلبية إضافية",               userId:manager._id,   userName:managerName },
      { type:"OUT", qty:30,  dest:"خط الضخ الجديد",         date:daysAgo(15),                                     userId:warehouse._id, userName:warehouseName },
      { type:"OUT", qty:20,  dest:"الصيانة الوقائية",       date:daysAgo(1),  notes:"برنامج PM الشهري",           userId:warehouse._id, userName:warehouseName },
    ],
    // 6 — CCT-T006: 3 txs → net = 3000 - 500 - 500 = 2000 ✓
    [
      { type:"IN",  qty:3000, source:"مصنع الكابلات الوطني",date:daysAgo(80), notes:"3000 متر بكرة",               userId:admin._id,     userName:adminName },
      { type:"OUT", qty:500,  dest:"لوحة التحكم الرئيسية",  date:daysAgo(45),                                     userId:warehouse._id, userName:warehouseName },
      { type:"OUT", qty:500,  dest:"توسعة خط الإنتاج",      date:daysAgo(10), notes:"مشروع الأتمتة",              userId:manager._id,   userName:managerName },
    ],
    // 7 — NSW-T007: 4 txs → net = 8 - 2 - 1 = 5 ✓
    [
      { type:"IN",  qty:8, source:"Dell Technologies",       date:daysAgo(100),notes:"مشروع البنية التحتية",       userId:admin._id,     userName:adminName },
      { type:"OUT", qty:2, dest:"غرفة الخوادم الرئيسية",    date:daysAgo(80),                                     userId:warehouse._id, userName:warehouseName },
      { type:"OUT", qty:1, dest:"مبنى الإدارة",              date:daysAgo(40),                                     userId:warehouse._id, userName:warehouseName },
      { type:"IN",  qty:0, source:"Dell Technologies",       date:daysAgo(10), notes:"بديل للعيب — pending",       userId:manager._id,   userName:managerName }, // qty=0 will be skipped
    ],
    // 8 — HFK-T008: 5 txs → net = 400 - 60 - 50 + 100 - 190 = 200 ✓
    [
      { type:"IN",  qty:400, source:"موردون متنوعون",        date:daysAgo(65), notes:"400 طقم (20 شنطة)",         userId:admin._id,     userName:adminName },
      { type:"OUT", qty:60,  dest:"موقع البناء أ",           date:daysAgo(50),                                     userId:warehouse._id, userName:warehouseName },
      { type:"OUT", qty:50,  dest:"موقع البناء ب",           date:daysAgo(35),                                     userId:warehouse._id, userName:warehouseName },
      { type:"IN",  qty:100, source:"موردون متنوعون",        date:daysAgo(20), notes:"إعادة تخزين",               userId:manager._id,   userName:managerName },
      { type:"OUT", qty:190, dest:"مشروع الخطوط الصحية",    date:daysAgo(7),  notes:"تسليم كمية كبيرة",           userId:manager._id,   userName:managerName },
    ],
    // 9 — DCM-T009: 3 txs → net = 10 - 5 - 3 = 2 ✓
    [
      { type:"IN",  qty:10, source:"المورد القديم",           date:daysAgo(200),notes:"مخزون قديم",                  userId:admin._id,     userName:adminName },
      { type:"OUT", qty:5,  dest:"الصيانة التاريخية",         date:daysAgo(150),                                     userId:warehouse._id, userName:warehouseName },
      { type:"OUT", qty:3,  dest:"قطع غيار بديلة",           date:daysAgo(90), notes:"استبدال طارئ",                userId:manager._id,   userName:managerName },
    ],
    // 10 — GIP-T010: 4 txs → net = 200 - 25 - 15 - 10 = 150 ✓
    [
      { type:"IN",  qty:200, source:"مصنع الأنابيب الوطني",  date:daysAgo(50), notes:"200 أنبوب (8 منصات)",         userId:admin._id,     userName:adminName },
      { type:"OUT", qty:25,  dest:"مشروع الصرف الصحي",       date:daysAgo(35),                                     userId:warehouse._id, userName:warehouseName },
      { type:"OUT", qty:15,  dest:"مشروع التوسعة الشمالية",  date:daysAgo(20),                                     userId:warehouse._id, userName:warehouseName },
      { type:"OUT", qty:10,  dest:"الصيانة المدنية",          date:daysAgo(8),  notes:"تغيير مواسير قديمة",         userId:manager._id,   userName:managerName },
    ],
  ];

  // ── Insert transactions ───────────────────────────────────────────────────
  console.log("");
  let total = 0;
  for (let i = 0; i < created.length; i++) {
    const item = created[i];
    const defs = (txSets[i] || []).filter(t => t.qty > 0);
    let count = 0;
    for (const def of defs) {
      const exists = await Tx.findOne({
        itemId: item._id, type: def.type, qty: def.qty,
        date: { $gte: new Date(def.date.getTime() - 60000), $lte: new Date(def.date.getTime() + 60000) },
      });
      if (exists) continue;
      await Tx.create({ ...def, itemId: item._id });
      count++; total++;
    }
    if (count > 0) console.log(`📋 ${item.sku.padEnd(10)} — ${count} transactions inserted`);
    else           console.log(`⏭  ${item.sku.padEnd(10)} — transactions already exist`);
  }

  console.log(`\n🌱 Done!  ${total} new transactions added.`);
  await mongoose.disconnect();
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
