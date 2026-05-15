require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

mongoose.connect(process.env.MONGODB_URI)
  .then(() => { console.log("✅ Connected"); run(); })
  .catch(e  => { console.error("❌", e.message); process.exit(1); });

// ── Schemas (mirror of server.js) ─────────────────────────────────────────────
const Dept = mongoose.model("Department", new mongoose.Schema({
  name: String, nameEn: String, color: { type: String, default: "#3b82f6" }, active: { type: Boolean, default: true },
}, { timestamps: true }));

const Cat = mongoose.model("Category", new mongoose.Schema({
  name: String, nameEn: String, deptId: mongoose.Schema.Types.ObjectId, active: { type: Boolean, default: true },
}, { timestamps: true }));

const User = mongoose.model("User", new mongoose.Schema({
  name: String, nameEn: String, username: { type: String, lowercase: true, trim: true },
  passwordHash: String, role: String, active: { type: Boolean, default: true },
}, { timestamps: true }));

const Item = mongoose.model("Item", new mongoose.Schema({
  name: String, nameEn: String, description: String,
  deptId: mongoose.Schema.Types.ObjectId, catId: mongoose.Schema.Types.ObjectId,
  sku: String, barcode: String, price: Number, qty: Number, minThreshold: Number,
  type: String, status: String, photo: String,
}, { timestamps: true }));

const Transaction = mongoose.model("Transaction", new mongoose.Schema({
  type: String, itemId: mongoose.Schema.Types.ObjectId, qty: Number,
  source: String, dest: String, userId: mongoose.Schema.Types.ObjectId,
  userName: String, date: Date, notes: String,
}, { timestamps: true }));

// ── Seed ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log("🗑  Clearing existing data...");
  await Promise.all([
    Dept.deleteMany({}), Cat.deleteMany({}),
    User.deleteMany({}), Item.deleteMany({}), Transaction.deleteMany({}),
  ]);

  // ── Users ──────────────────────────────────────────────────────────────────
  console.log("👥 Creating users...");
  const hash = (p) => bcrypt.hash(p, 12);
  const users = await User.create([
    { name:"مدير النظام",    nameEn:"System Admin",    username:"admin",   passwordHash: await hash("admin"), role:"admin"     },
    { name:"أحمد محمد",      nameEn:"Ahmed Mohamed",   username:"ahmed",   passwordHash: await hash("123"),   role:"manager"   },
    { name:"سارة علي",       nameEn:"Sara Ali",        username:"sara",    passwordHash: await hash("123"),   role:"warehouse" },
    { name:"خالد عمر",       nameEn:"Khaled Omar",     username:"khaled",  passwordHash: await hash("123"),   role:"viewer"    },
    { name:"منى حسن",        nameEn:"Mona Hassan",     username:"mona",    passwordHash: await hash("123"),   role:"warehouse" },
    { name:"يوسف إبراهيم",   nameEn:"Youssef Ibrahim", username:"youssef", passwordHash: await hash("123"),   role:"manager"   },
  ]);
  const [admin, ahmed, sara, , mona, youssef] = users;

  // ── Departments ────────────────────────────────────────────────────────────
  console.log("🏢 Creating departments...");
  const depts = await Dept.create([
    { name:"كهربائي",         nameEn:"Electrical",    color:"#f59e0b" },
    { name:"ميكانيكي",        nameEn:"Mechanical",    color:"#3b82f6" },
    { name:"هيدروليكي",       nameEn:"Hydraulic",     color:"#06b6d4" },
    { name:"تقنية المعلومات", nameEn:"IT",            color:"#8b5cf6" },
    { name:"مواد البناء",     nameEn:"Construction",  color:"#f97316" },
    { name:"سلامة وحماية",    nameEn:"Safety",        color:"#ef4444" },
  ]);
  const [elec, mech, hydro, it, civil, safety] = depts;

  // ── Categories ─────────────────────────────────────────────────────────────
  console.log("📂 Creating categories...");
  const cats = await Cat.create([
    { name:"محركات",       nameEn:"Motors",          deptId: elec._id  },
    { name:"كابلات",       nameEn:"Cables",          deptId: elec._id  },
    { name:"لوحات تحكم",   nameEn:"Control Panels",  deptId: elec._id  },
    { name:"مضخات",        nameEn:"Pumps",           deptId: mech._id  },
    { name:"تروس",         nameEn:"Gears",           deptId: mech._id  },
    { name:"صمامات",       nameEn:"Valves",          deptId: hydro._id },
    { name:"خراطيم",       nameEn:"Hoses",           deptId: hydro._id },
    { name:"أجهزة",        nameEn:"Hardware",        deptId: it._id    },
    { name:"شبكات",        nameEn:"Networking",      deptId: it._id    },
    { name:"أنابيب",       nameEn:"Pipes",           deptId: civil._id },
    { name:"أسمنت ومواد",  nameEn:"Cement & Materials", deptId: civil._id },
    { name:"معدات حماية",  nameEn:"PPE",             deptId: safety._id },
  ]);
  const [cMotors, cCables, cPanels, cPumps, cGears, cValves, cHoses, cHardware, cNet, cPipes, cCement, cPPE] = cats;

  // ── Items ──────────────────────────────────────────────────────────────────
  // photos: picsum.photos (always works, no auth needed)
  const pic = (id, w=400, h=300) => `https://picsum.photos/id/${id}/${w}/${h}`;

  console.log("📦 Creating items...");
  const items = await Item.create([
    // Electrical – Motors
    { name:"محرك كهربائي 5HP",    nameEn:"Electric Motor 5HP",      deptId:elec._id,  catId:cMotors._id,  sku:"EM-001", barcode:"6221023001001", price:4500,  qty:24,  minThreshold:5,  type:"unit",  status:"active",       description:"محرك ثلاثي الأوجه للاستخدام الصناعي", photo:pic(1056) },
    { name:"محرك كهربائي 10HP",   nameEn:"Electric Motor 10HP",     deptId:elec._id,  catId:cMotors._id,  sku:"EM-002", barcode:"6221023001002", price:7800,  qty:12,  minThreshold:3,  type:"unit",  status:"active",       description:"محرك صناعي عالي الأداء",              photo:pic(1060) },
    { name:"محرك سيرفو 750W",     nameEn:"Servo Motor 750W",        deptId:elec._id,  catId:cMotors._id,  sku:"EM-003", barcode:"6221023001003", price:2900,  qty:8,   minThreshold:2,  type:"unit",  status:"active",       description:"محرك سيرفو دقيق للتحكم الآلي",        photo:pic(1062) },
    // Electrical – Cables
    { name:"كابل نحاسي 16مم",     nameEn:"Copper Cable 16mm",       deptId:elec._id,  catId:cCables._id,  sku:"CC-001", barcode:"6221023002001", price:85,    qty:800, minThreshold:100,type:"roll",  status:"active",       description:"كابل طاقة للمتر",                      photo:pic(1080) },
    { name:"كابل نحاسي 6مم",      nameEn:"Copper Cable 6mm",        deptId:elec._id,  catId:cCables._id,  sku:"CC-002", barcode:"6221023002002", price:38,    qty:1200,minThreshold:200,type:"roll",  status:"active",       description:"كابل توزيع خفيف",                      photo:pic(1082) },
    { name:"كابل بيانات CAT6",    nameEn:"CAT6 Data Cable",         deptId:elec._id,  catId:cCables._id,  sku:"CC-003", barcode:"6221023002003", price:22,    qty:500, minThreshold:100,type:"roll",  status:"active",       description:"كابل شبكات عالي السرعة",               photo:pic(1083) },
    // Electrical – Panels
    { name:"لوحة تحكم كهربائية",  nameEn:"Electrical Control Panel",deptId:elec._id,  catId:cPanels._id,  sku:"CP-001", barcode:"6221023003001", price:15000, qty:3,   minThreshold:2,  type:"unit",  status:"active",       description:"لوحة توزيع رئيسية 400A",               photo:pic(325)  },
    { name:"قاطع حرارى 63A",      nameEn:"Thermal Breaker 63A",     deptId:elec._id,  catId:cPanels._id,  sku:"CP-002", barcode:"6221023003002", price:320,   qty:0,   minThreshold:10, type:"unit",  status:"active",       description:"قاطع كهربائي حماية",                   photo:pic(326)  },
    // Mechanical – Pumps
    { name:"مضخة هيدروليكية",     nameEn:"Hydraulic Pump",          deptId:mech._id,  catId:cPumps._id,   sku:"HP-001", barcode:"6221023004001", price:8200,  qty:3,   minThreshold:5,  type:"unit",  status:"active",       description:"مضخة طرد مركزي عالية الضغط",           photo:pic(206)  },
    { name:"مضخة مياه 2 بوصة",    nameEn:"Water Pump 2\"",          deptId:mech._id,  catId:cPumps._id,   sku:"HP-002", barcode:"6221023004002", price:1800,  qty:15,  minThreshold:4,  type:"unit",  status:"active",       description:"مضخة رفع مياه",                        photo:pic(207)  },
    // Mechanical – Gears
    { name:"علبة تروس صناعية",    nameEn:"Industrial Gearbox",      deptId:mech._id,  catId:cGears._id,   sku:"GB-001", barcode:"6221023005001", price:12000, qty:7,   minThreshold:3,  type:"unit",  status:"active",       description:"علبة تروس للماكينات الثقيلة",           photo:pic(450)  },
    { name:"تروس مخروطية 1:5",    nameEn:"Bevel Gear 1:5",          deptId:mech._id,  catId:cGears._id,   sku:"GB-002", barcode:"6221023005002", price:3400,  qty:20,  minThreshold:5,  type:"unit",  status:"active",       description:"تروس دقيقة لناقل الحركة",               photo:pic(451)  },
    // Hydraulic – Valves
    { name:"صمام فراشة DN80",     nameEn:"Butterfly Valve DN80",    deptId:hydro._id, catId:cValves._id,  sku:"BV-001", barcode:"6221023006001", price:1800,  qty:0,   minThreshold:10, type:"unit",  status:"active",       description:"صمام صناعي PN16",                       photo:pic(500)  },
    { name:"صمام كروي ½ بوصة",    nameEn:"Ball Valve 1/2\"",        deptId:hydro._id, catId:cValves._id,  sku:"BV-002", barcode:"6221023006002", price:95,    qty:200, minThreshold:30, type:"unit",  status:"active",       description:"صمام كروي ستانلس",                      photo:pic(501)  },
    { name:"صمام تحكم كهربائي",   nameEn:"Electric Control Valve",  deptId:hydro._id, catId:cValves._id,  sku:"BV-003", barcode:"6221023006003", price:4500,  qty:4,   minThreshold:5,  type:"unit",  status:"active",       description:"صمام تحكم 24V DC",                      photo:pic(502)  },
    // Hydraulic – Hoses
    { name:"خرطوم هيدروليك DN25", nameEn:"Hydraulic Hose DN25",     deptId:hydro._id, catId:cHoses._id,   sku:"HH-001", barcode:"6221023007001", price:450,   qty:60,  minThreshold:15, type:"roll",  status:"active",       description:"خرطوم ضغط عالي 250 بار",               photo:pic(514)  },
    // IT – Hardware
    { name:"وحدة تخزين 32TB",     nameEn:"NAS Storage 32TB",        deptId:it._id,    catId:cHardware._id,sku:"NS-001", barcode:"6221023008001", price:35000, qty:4,   minThreshold:2,  type:"unit",  status:"active",       description:"وحدة تخزين شبكية",                     photo:pic(48)   },
    { name:"خادم رك 2U",          nameEn:"Rack Server 2U",          deptId:it._id,    catId:cHardware._id,sku:"NS-002", barcode:"6221023008002", price:65000, qty:2,   minThreshold:1,  type:"unit",  status:"active",       description:"خادم إنتاج Intel Xeon",                 photo:pic(49)   },
    { name:"شاشة 27 بوصة 4K",     nameEn:"27\" 4K Monitor",         deptId:it._id,    catId:cHardware._id,sku:"NS-003", barcode:"6221023008003", price:4200,  qty:18,  minThreshold:3,  type:"unit",  status:"active",       description:"شاشة IPS احترافية",                    photo:pic(50)   },
    // IT – Networking
    { name:"سويتش 24 منفذ",       nameEn:"24-Port Switch",          deptId:it._id,    catId:cNet._id,     sku:"NT-001", barcode:"6221023009001", price:3800,  qty:6,   minThreshold:2,  type:"unit",  status:"active",       description:"سويتش مُدار Gigabit",                   photo:pic(303)  },
    { name:"راوتر صناعي",          nameEn:"Industrial Router",       deptId:it._id,    catId:cNet._id,     sku:"NT-002", barcode:"6221023009002", price:8500,  qty:3,   minThreshold:1,  type:"unit",  status:"active",       description:"راوتر شبكة داخلية عالي الأداء",         photo:pic(304)  },
    // Construction – Pipes
    { name:"أنبوب PVC 4 بوصة",    nameEn:"PVC Pipe 4\"",            deptId:civil._id, catId:cPipes._id,   sku:"PP-001", barcode:"6221023010001", price:75,    qty:350, minThreshold:50, type:"unit",  status:"active",       description:"أنبوب صرف صحي",                        photo:pic(255)  },
    { name:"أنبوب حديد 2 بوصة",   nameEn:"Steel Pipe 2\"",          deptId:civil._id, catId:cPipes._id,   sku:"PP-002", barcode:"6221023010002", price:210,   qty:180, minThreshold:30, type:"unit",  status:"active",       description:"أنبوب مجلفن ضغط",                      photo:pic(256)  },
    // Construction – Cement
    { name:"أسمنت بورتلاندي",      nameEn:"Portland Cement",         deptId:civil._id, catId:cCement._id,  sku:"CM-001", barcode:"6221023011001", price:28,    qty:0,   minThreshold:100,type:"bag",   status:"active",       description:"أسمنت 42.5N كيس 50 كجم",              photo:pic(280)  },
    { name:"رمل ناعم",             nameEn:"Fine Sand",               deptId:civil._id, catId:cCement._id,  sku:"CM-002", barcode:"6221023011002", price:15,    qty:600, minThreshold:200,type:"bag",   status:"active",       description:"رمل مناخل للبناء",                     photo:pic(281)  },
    // Safety – PPE
    { name:"خوذة سلامة",           nameEn:"Safety Helmet",           deptId:safety._id,catId:cPPE._id,     sku:"SF-001", barcode:"6221023012001", price:85,    qty:50,  minThreshold:20, type:"unit",  status:"active",       description:"خوذة حماية مطابقة ISO",                photo:pic(627)  },
    { name:"حذاء سلامة S3",        nameEn:"Safety Shoe S3",          deptId:safety._id,catId:cPPE._id,     sku:"SF-002", barcode:"6221023012002", price:420,   qty:30,  minThreshold:10, type:"unit",  status:"active",       description:"حذاء مقاوم للاختراق والانزلاق",        photo:pic(628)  },
    { name:"نظارات واقية",          nameEn:"Safety Goggles",          deptId:safety._id,catId:cPPE._id,     sku:"SF-003", barcode:"6221023012003", price:45,    qty:4,   minThreshold:15, type:"unit",  status:"active",       description:"نظارات مضادة للبخار والغبار",           photo:pic(629)  },
    { name:"قفازات عمل نيتريل",    nameEn:"Nitrile Work Gloves",     deptId:safety._id,catId:cPPE._id,     sku:"SF-004", barcode:"6221023012004", price:18,    qty:200, minThreshold:50, type:"pack",  status:"active",       description:"علبة 100 قفاز",                        photo:pic(630)  },
    { name:"حزام أمان كامل",       nameEn:"Full Body Harness",       deptId:safety._id,catId:cPPE._id,     sku:"SF-005", barcode:"6221023012005", price:680,   qty:12,  minThreshold:5,  type:"unit",  status:"discontinued", description:"حزام أمان للعمل على الارتفاعات",       photo:pic(631)  },
  ]);

  // ── Transactions ───────────────────────────────────────────────────────────
  console.log("🔄 Creating transactions...");
  const d = (daysAgo) => new Date(Date.now() - daysAgo * 86400000);

  await Transaction.create([
    // IN transactions
    { type:"IN",  itemId:items[0]._id,  qty:10, source:"شركة المحركات العربية",        userId:ahmed._id, userName:"أحمد محمد",    date:d(30), notes:"توريد ربع سنوي" },
    { type:"IN",  itemId:items[3]._id,  qty:500,source:"مستودع الكابلات المركزي",      userId:youssef._id,userName:"يوسف إبراهيم",date:d(28), notes:"شراء دفعة" },
    { type:"IN",  itemId:items[8]._id,  qty:5,  source:"شركة المضخات الدولية",         userId:ahmed._id, userName:"أحمد محمد",    date:d(25), notes:"استبدال معطل" },
    { type:"IN",  itemId:items[15]._id, qty:2,  source:"مستودع تقنية المعلومات",       userId:youssef._id,userName:"يوسف إبراهيم",date:d(20), notes:"توسعة المستودع" },
    { type:"IN",  itemId:items[20]._id, qty:100,source:"مورد البناء الوطني",           userId:ahmed._id, userName:"أحمد محمد",    date:d(18) },
    { type:"IN",  itemId:items[24]._id, qty:30, source:"شركة معدات السلامة",           userId:sara._id,  userName:"سارة علي",     date:d(15), notes:"توريد شهري PPE" },
    { type:"IN",  itemId:items[10]._id, qty:3,  source:"الوكيل الإقليمي للتروس",       userId:youssef._id,userName:"يوسف إبراهيم",date:d(14) },
    { type:"IN",  itemId:items[4]._id,  qty:300,source:"مستودع الكابلات المركزي",      userId:sara._id,  userName:"سارة علي",     date:d(12) },
    { type:"IN",  itemId:items[12]._id, qty:50, source:"موردو الصمامات الصناعية",      userId:ahmed._id, userName:"أحمد محمد",    date:d(10), notes:"تجديد مخزون" },
    { type:"IN",  itemId:items[17]._id, qty:5,  source:"وكيل HP الرسمي",              userId:youssef._id,userName:"يوسف إبراهيم",date:d(8),  notes:"توسعة الطاقة" },
    { type:"IN",  itemId:items[26]._id, qty:20, source:"شركة معدات السلامة",           userId:mona._id,  userName:"منى حسن",      date:d(5),  notes:"طلبية طارئة" },
    { type:"IN",  itemId:items[1]._id,  qty:5,  source:"شركة المحركات العربية",        userId:ahmed._id, userName:"أحمد محمد",    date:d(3) },
    { type:"IN",  itemId:items[22]._id, qty:200,source:"مصنع الأسمنت الوطني",         userId:mona._id,  userName:"منى حسن",      date:d(2),  notes:"مشروع البناء الجديد" },
    // OUT transactions
    { type:"OUT", itemId:items[0]._id,  qty:2,  dest:"مشروع خط التبريد A",            userId:sara._id,  userName:"سارة علي",     date:d(27), notes:"صرف للتركيب" },
    { type:"OUT", itemId:items[6]._id,  qty:1,  dest:"ورشة الكهرباء الرئيسية",        userId:mona._id,  userName:"منى حسن",      date:d(24), notes:"صيانة لوحة رئيسية" },
    { type:"OUT", itemId:items[3]._id,  qty:200,dest:"مشروع التوسعة B",               userId:sara._id,  userName:"سارة علي",     date:d(22) },
    { type:"OUT", itemId:items[11]._id, qty:2,  dest:"ماكينة الإنتاج #3",             userId:mona._id,  userName:"منى حسن",      date:d(19), notes:"تبديل تروس تالفة" },
    { type:"OUT", itemId:items[16]._id, qty:1,  dest:"غرفة السيرفر الرئيسية",         userId:sara._id,  userName:"سارة علي",     date:d(17), notes:"تركيب" },
    { type:"OUT", itemId:items[9]._id,  qty:3,  dest:"وحدة المعالجة #1",              userId:mona._id,  userName:"منى حسن",      date:d(13) },
    { type:"OUT", itemId:items[20]._id, qty:50, dest:"مشروع مبنى الإدارة",            userId:sara._id,  userName:"سارة علي",     date:d(11), notes:"أساسات الطابق الأول" },
    { type:"OUT", itemId:items[24]._id, qty:10, dest:"فريق الصيانة الميداني",          userId:mona._id,  userName:"منى حسن",      date:d(9),  notes:"توزيع أسبوعي" },
    { type:"OUT", itemId:items[25]._id, qty:5,  dest:"ورشة الميكانيكا",               userId:sara._id,  userName:"سارة علي",     date:d(7) },
    { type:"OUT", itemId:items[14]._id, qty:1,  dest:"خط الإنتاج #2",                 userId:mona._id,  userName:"منى حسن",      date:d(6),  notes:"صيانة طارئة" },
    { type:"OUT", itemId:items[18]._id, qty:2,  dest:"مكتب المشاريع الجديد",          userId:sara._id,  userName:"سارة علي",     date:d(4) },
    { type:"OUT", itemId:items[8]._id,  qty:1,  dest:"محطة الضخ الرئيسية",            userId:mona._id,  userName:"منى حسن",      date:d(2),  notes:"بديل للمضخة التالفة" },
    { type:"OUT", itemId:items[1]._id,  qty:1,  dest:"مشروع خط التبريد B",            userId:sara._id,  userName:"سارة علي",     date:d(1),  notes:"تركيب اليوم" },
  ]);

  console.log("✅ Seeded successfully!");
  console.log("─────────────────────────────────────");
  console.log("  Users:");
  console.log("    admin   / admin  (System Admin)");
  console.log("    ahmed   / 123    (Manager)");
  console.log("    sara    / 123    (Warehouse)");
  console.log("    khaled  / 123    (Viewer)");
  console.log("    mona    / 123    (Warehouse)");
  console.log("    youssef / 123    (Manager)");
  console.log("─────────────────────────────────────");
  console.log(`  ${depts.length} departments, ${cats.length} categories`);
  console.log(`  ${items.length} items, 26 transactions`);
  console.log("─────────────────────────────────────");

  mongoose.disconnect();
}
