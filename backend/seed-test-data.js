const mongoose = require('mongoose');
require('dotenv').config();

const CID = new mongoose.Types.ObjectId('6a0ecb8d36208ee9bbbdd4fe');
const USERS = [
  { _id: new mongoose.Types.ObjectId('6a0ecbe08743d3a908d59031'), name: 'مدير النظام' },
  { _id: new mongoose.Types.ObjectId('6a0ecbe08743d3a908d59032'), name: 'أحمد محمد' },
  { _id: new mongoose.Types.ObjectId('6a0ecbe08743d3a908d59033'), name: 'سارة علي' },
];

const DeptSchema = new mongoose.Schema({ companyId: mongoose.Schema.Types.ObjectId, name: String, nameEn: String, color: String }, { timestamps: true });
const CatSchema  = new mongoose.Schema({ companyId: mongoose.Schema.Types.ObjectId, name: String, nameEn: String }, { timestamps: true });
const ItemSchema = new mongoose.Schema({ companyId: mongoose.Schema.Types.ObjectId, name: String, nameEn: String, sku: String, barcode: String, price: Number, qty: Number, minThreshold: Number, type: String, status: String, deptId: mongoose.Schema.Types.ObjectId, catId: mongoose.Schema.Types.ObjectId }, { timestamps: true });
const TxSchema   = new mongoose.Schema({ companyId: mongoose.Schema.Types.ObjectId, type: String, itemId: mongoose.Schema.Types.ObjectId, qty: Number, source: String, dest: String, userId: mongoose.Schema.Types.ObjectId, userName: String, date: Date, notes: String }, { timestamps: true });

const Dept = mongoose.model('Department', DeptSchema);
const Cat  = mongoose.model('Category', CatSchema);
const Item = mongoose.model('Item', ItemSchema);
const Tx   = mongoose.model('Transaction', TxSchema);

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  // 1. Departments
  const depts = await Dept.insertMany([
    { companyId: CID, name: 'الكهرباء',    nameEn: 'Electrical',  color: '#f59e0b' },
    { companyId: CID, name: 'الميكانيكا',  nameEn: 'Mechanical',  color: '#3b82f6' },
    { companyId: CID, name: 'السلامة',     nameEn: 'Safety',      color: '#ef4444' },
    { companyId: CID, name: 'المدني',      nameEn: 'Civil',       color: '#10b981' },
    { companyId: CID, name: 'الإلكترونيات', nameEn: 'Electronics', color: '#8b5cf6' },
  ]);
  console.log('Depts inserted:', depts.length);

  // 2. Categories
  const cats = await Cat.insertMany([
    { companyId: CID, name: 'كابلات', nameEn: 'Cables' },
    { companyId: CID, name: 'محركات', nameEn: 'Motors' },
    { companyId: CID, name: 'أدوات السلامة', nameEn: 'Safety Gear' },
    { companyId: CID, name: 'أدوات', nameEn: 'Tools' },
    { companyId: CID, name: 'أجهزة', nameEn: 'Devices' },
  ]);
  console.log('Cats inserted:', cats.length);

  const [elec, mech, safe, civil, elecs] = depts;
  const [cables, motors, safeGear, tools, devices] = cats;

  // 3. Items — 30 new items
  const itemDefs = [
    { name:'كابل نحاسي 10مم',        nameEn:'Copper Cable 10mm',        sku:'CBL-010', price:85,    qty:200, min:30, dept:elec._id,  cat:cables._id  },
    { name:'كابل نحاسي 25مم',        nameEn:'Copper Cable 25mm',        sku:'CBL-025', price:180,   qty:120, min:20, dept:elec._id,  cat:cables._id  },
    { name:'كابل نحاسي 50مم',        nameEn:'Copper Cable 50mm',        sku:'CBL-050', price:350,   qty:80,  min:15, dept:elec._id,  cat:cables._id  },
    { name:'كابل NYY 4x6',           nameEn:'NYY Cable 4x6',            sku:'CBL-N46', price:220,   qty:150, min:25, dept:elec._id,  cat:cables._id  },
    { name:'محرك كهربائي 2.5HP',    nameEn:'Electric Motor 2.5HP',     sku:'MOT-025', price:3200,  qty:8,   min:2,  dept:mech._id,  cat:motors._id  },
    { name:'محرك كهربائي 10HP',     nameEn:'Electric Motor 10HP',      sku:'MOT-100', price:7500,  qty:5,   min:1,  dept:mech._id,  cat:motors._id  },
    { name:'محرك كهربائي 15HP',     nameEn:'Electric Motor 15HP',      sku:'MOT-150', price:11000, qty:3,   min:1,  dept:mech._id,  cat:motors._id  },
    { name:'مضخة طاردة مركزية',     nameEn:'Centrifugal Pump',         sku:'PMP-001', price:9500,  qty:4,   min:1,  dept:mech._id,  cat:motors._id  },
    { name:'مضخة تروس',             nameEn:'Gear Pump',                sku:'PMP-002', price:6800,  qty:6,   min:2,  dept:mech._id,  cat:motors._id  },
    { name:'خوذة السلامة',           nameEn:'Safety Helmet',            sku:'SFT-HLM', price:45,    qty:50,  min:10, dept:safe._id,  cat:safeGear._id},
    { name:'نظارات الحماية',         nameEn:'Safety Goggles',           sku:'SFT-GGL', price:35,    qty:80,  min:15, dept:safe._id,  cat:safeGear._id},
    { name:'قفازات مقاومة للحرارة', nameEn:'Heat-Resistant Gloves',    sku:'SFT-GLV', price:60,    qty:60,  min:12, dept:safe._id,  cat:safeGear._id},
    { name:'حذاء السلامة',           nameEn:'Safety Shoes',             sku:'SFT-SHO', price:180,   qty:30,  min:5,  dept:safe._id,  cat:safeGear._id},
    { name:'طفاية الحريق 6كج',      nameEn:'Fire Extinguisher 6kg',    sku:'SFT-EXT', price:320,   qty:15,  min:3,  dept:safe._id,  cat:safeGear._id},
    { name:'صمام بوابة 2 بوصة',     nameEn:'Gate Valve 2 inch',        sku:'VLV-GT2', price:280,   qty:25,  min:5,  dept:civil._id, cat:tools._id   },
    { name:'صمام فراشة 4 بوصة',     nameEn:'Butterfly Valve 4in',      sku:'VLV-BF4', price:450,   qty:12,  min:3,  dept:civil._id, cat:tools._id   },
    { name:'صمام شيك 3 بوصة',       nameEn:'Check Valve 3 inch',       sku:'VLV-CHK', price:320,   qty:18,  min:4,  dept:civil._id, cat:tools._id   },
    { name:'أنبوب PPR 32مم',        nameEn:'PPR Pipe 32mm',            sku:'PPR-032', price:28,    qty:300, min:50, dept:civil._id, cat:tools._id   },
    { name:'أنبوب PPR 63مم',        nameEn:'PPR Pipe 63mm',            sku:'PPR-063', price:65,    qty:180, min:30, dept:civil._id, cat:tools._id   },
    { name:'مقياس ضغط 0-10 بار',   nameEn:'Pressure Gauge 0-10bar',   sku:'GAU-010', price:95,    qty:20,  min:4,  dept:civil._id, cat:devices._id },
    { name:'PLC سيمنز S7-1200',     nameEn:'Siemens S7-1200 PLC',      sku:'PLC-S712',price:18500, qty:3,   min:1,  dept:elecs._id, cat:devices._id },
    { name:'HMI 7 بوصة تاتش',      nameEn:'HMI 7 inch Touch Panel',   sku:'HMI-007', price:8200,  qty:4,   min:1,  dept:elecs._id, cat:devices._id },
    { name:'محول تردد 7.5kW',       nameEn:'VFD Drive 7.5kW',          sku:'VFD-075', price:6500,  qty:5,   min:1,  dept:elecs._id, cat:devices._id },
    { name:'محول تردد 15kW',        nameEn:'VFD Drive 15kW',           sku:'VFD-150', price:9800,  qty:3,   min:1,  dept:elecs._id, cat:devices._id },
    { name:'مستشعر حرارة PT100',    nameEn:'Thermocouple PT100',       sku:'SEN-PT1', price:120,   qty:40,  min:8,  dept:elecs._id, cat:devices._id },
    { name:'قاطع كهربائي 63A',      nameEn:'Circuit Breaker 63A',      sku:'MCB-063', price:85,    qty:60,  min:12, dept:elec._id,  cat:tools._id   },
    { name:'قاطع كهربائي 125A',     nameEn:'Circuit Breaker 125A',     sku:'MCB-125', price:240,   qty:25,  min:5,  dept:elec._id,  cat:tools._id   },
    { name:'كونتاكتور 25A',         nameEn:'Contactor 25A',            sku:'CTR-025', price:145,   qty:35,  min:7,  dept:elec._id,  cat:tools._id   },
    { name:'ريلاي حراري 18-25A',    nameEn:'Thermal Relay 18-25A',     sku:'TRL-025', price:95,    qty:30,  min:6,  dept:elec._id,  cat:tools._id   },
    { name:'لوحة توزيع 12 دائرة',  nameEn:'Distribution Board 12-way', sku:'DB-012',  price:380,   qty:8,   min:2,  dept:elec._id,  cat:tools._id   },
  ];

  const items = await Item.insertMany(itemDefs.map(d => ({
    companyId: CID, name: d.name, nameEn: d.nameEn, sku: d.sku,
    barcode: d.sku, price: d.price, qty: d.qty, minThreshold: d.min,
    type: 'unit', status: 'active', deptId: d.dept, catId: d.cat,
  })));
  console.log('Items inserted:', items.length);

  // 4. Item pool: new + the 6 existing seeded items
  const existingIds = [
    { _id: new mongoose.Types.ObjectId('6a0ecbe28743d3a908d59041'), name: 'Electric Motor 5HP' },
    { _id: new mongoose.Types.ObjectId('6a0ecbe28743d3a908d59042'), name: 'Hydraulic Pump' },
    { _id: new mongoose.Types.ObjectId('6a0ecbe28743d3a908d59043'), name: 'Copper Cable 16mm' },
    { _id: new mongoose.Types.ObjectId('6a0ecbe28743d3a908d59044'), name: 'Butterfly Valve DN80' },
    { _id: new mongoose.Types.ObjectId('6a0ecbe28743d3a908d59045'), name: 'NAS Storage 32TB' },
    { _id: new mongoose.Types.ObjectId('6a0ecbe28743d3a908d59046'), name: 'Industrial Gearbox' },
  ];
  const allItems = [...items.map(i => ({ _id: i._id, name: i.nameEn })), ...existingIds];

  // 5. 100 transactions
  const sources = ['Main Supplier', 'Local Market', 'Import Shipment', 'Emergency Purchase', 'Returned Stock'];
  const dests   = ['Workshop A', 'Workshop B', 'Site 1', 'Site 2', 'Maintenance Dept'];
  const noteOptions = ['Monthly replenishment', 'Urgent order', 'Scheduled maintenance', 'Project delivery', 'Routine stock', null, null];

  const txDocs = [];
  const now = Date.now();
  for (let i = 0; i < 100; i++) {
    const item = allItems[Math.floor(Math.random() * allItems.length)];
    const u    = USERS[Math.floor(Math.random() * USERS.length)];
    const type = Math.random() > 0.4 ? 'IN' : 'OUT';
    const qty  = Math.floor(Math.random() * 20) + 1;
    const daysAgo = Math.floor(Math.random() * 90);
    const note = noteOptions[Math.floor(Math.random() * noteOptions.length)];
    txDocs.push({
      companyId: CID,
      type,
      itemId:   item._id,
      qty,
      source:   type === 'IN'  ? sources[Math.floor(Math.random() * sources.length)] : undefined,
      dest:     type === 'OUT' ? dests[Math.floor(Math.random() * dests.length)]     : undefined,
      userId:   u._id,
      userName: u.name,
      date:     new Date(now - daysAgo * 86400000),
      notes:    note || undefined,
    });
  }
  await Tx.insertMany(txDocs);
  console.log('Transactions inserted:', txDocs.length);
  console.log('All done!');
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
