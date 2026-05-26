/**
 * seed.js — NexINV testing data
 * Run:  node seed.js
 *
 * Creates:
 *   • 1 enterprise owner (login: enterprise / Pass1234)
 *   • 3 companies owned by that enterprise user
 *   • For each company: owner, admin, manager, warehouse user, viewer
 *   • Departments, categories, items (15 per company), transactions (50 per company)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const Company     = require('./models/Company');
const User        = require('./models/User');
const Department  = require('./models/Department');
const Category    = require('./models/Category');
const Item        = require('./models/Item');
const Transaction = require('./models/Transaction');

// ── helpers ───────────────────────────────────────────────────────────────────
const hash    = p => bcrypt.hash(p, 10);
const pick    = arr => arr[Math.floor(Math.random() * arr.length)];
const rnd     = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = n => new Date(Date.now() - n * 86_400_000);

// ── company blueprints ────────────────────────────────────────────────────────
const COMPANIES = [
  {
    code: 'TECH01',
    name: 'TechCorp Solutions',
    description: 'Enterprise technology hardware & accessories distributor.',
    industry: 'Electronics',
    baseCurrency: 'USD',
    primaryColor: '#3b82f6',
    departments: [
      { name: 'Networking',  nameEn: 'Networking',  color: '#3b82f6' },
      { name: 'Peripherals', nameEn: 'Peripherals', color: '#8b5cf6' },
      { name: 'Storage',     nameEn: 'Storage',     color: '#06b6d4' },
    ],
    categories: {
      'Networking':  ['Routers', 'Switches', 'Access Points'],
      'Peripherals': ['Keyboards', 'Mice', 'Monitors'],
      'Storage':     ['SSDs', 'HDDs', 'USB Drives'],
    },
    items: [
      { name: 'Cisco RV340 Router',         sku: 'NET-001', price: 350, qty: 24,  minThreshold: 5,   type: 'unit',  dept: 'Networking',  cat: 'Routers'       },
      { name: 'TP-Link 24-Port Switch',     sku: 'NET-002', price: 180, qty: 15,  minThreshold: 3,   type: 'unit',  dept: 'Networking',  cat: 'Switches'      },
      { name: 'UniFi AP AC Pro',            sku: 'NET-003', price: 130, qty: 40,  minThreshold: 8,   type: 'unit',  dept: 'Networking',  cat: 'Access Points' },
      { name: 'Ubiquiti ER-X Router',       sku: 'NET-004', price: 79,  qty: 18,  minThreshold: 4,   type: 'unit',  dept: 'Networking',  cat: 'Routers'       },
      { name: 'Netgear 8-Port Switch',      sku: 'NET-005', price: 45,  qty: 60,  minThreshold: 10,  type: 'unit',  dept: 'Networking',  cat: 'Switches'      },
      { name: 'Logitech MX Keys',           sku: 'PER-001', price: 110, qty: 35,  minThreshold: 5,   type: 'unit',  dept: 'Peripherals', cat: 'Keyboards'     },
      { name: 'Logitech MX Master 3',       sku: 'PER-002', price: 100, qty: 50,  minThreshold: 8,   type: 'unit',  dept: 'Peripherals', cat: 'Mice'          },
      { name: 'Dell 27" 4K Monitor',        sku: 'PER-003', price: 480, qty: 12,  minThreshold: 2,   type: 'unit',  dept: 'Peripherals', cat: 'Monitors'      },
      { name: 'Keychron K2 Keyboard',       sku: 'PER-004', price: 90,  qty: 28,  minThreshold: 5,   type: 'unit',  dept: 'Peripherals', cat: 'Keyboards'     },
      { name: 'Samsung 27" Curved Monitor', sku: 'PER-005', price: 320, qty: 8,   minThreshold: 2,   type: 'unit',  dept: 'Peripherals', cat: 'Monitors'      },
      { name: 'Samsung 980 Pro 1TB SSD',    sku: 'STR-001', price: 120, qty: 80,  minThreshold: 15,  type: 'unit',  dept: 'Storage',     cat: 'SSDs'          },
      { name: 'WD Blue 2TB HDD',            sku: 'STR-002', price: 55,  qty: 95,  minThreshold: 20,  type: 'unit',  dept: 'Storage',     cat: 'HDDs'          },
      { name: 'Kingston 128GB USB 3.2',     sku: 'STR-003', price: 18,  qty: 200, minThreshold: 30,  type: 'unit',  dept: 'Storage',     cat: 'USB Drives'    },
      { name: 'Seagate 4TB External HDD',   sku: 'STR-004', price: 90,  qty: 45,  minThreshold: 10,  type: 'unit',  dept: 'Storage',     cat: 'HDDs'          },
      { name: 'Crucial MX500 500GB SSD',    sku: 'STR-005', price: 60,  qty: 110, minThreshold: 20,  type: 'unit',  dept: 'Storage',     cat: 'SSDs'          },
    ],
  },
  {
    code: 'FOOD01',
    name: 'FoodLine Group',
    description: 'Wholesale food & beverage supply chain management.',
    industry: 'Food & Beverage',
    baseCurrency: 'USD',
    primaryColor: '#10b981',
    departments: [
      { name: 'Dairy',     nameEn: 'Dairy',     color: '#10b981' },
      { name: 'Beverages', nameEn: 'Beverages', color: '#f59e0b' },
      { name: 'Dry Goods', nameEn: 'Dry Goods', color: '#ef4444' },
    ],
    categories: {
      'Dairy':     ['Cheese', 'Yogurt', 'Butter'],
      'Beverages': ['Juices', 'Water', 'Energy Drinks'],
      'Dry Goods': ['Grains', 'Pasta', 'Canned Goods'],
    },
    items: [
      { name: 'Cheddar Cheese Block 1kg',   sku: 'DAI-001', price: 12,  qty: 300,  minThreshold: 50,  type: 'unit', dept: 'Dairy',     cat: 'Cheese'        },
      { name: 'Greek Yogurt 500g',          sku: 'DAI-002', price: 4,   qty: 500,  minThreshold: 100, type: 'unit', dept: 'Dairy',     cat: 'Yogurt'        },
      { name: 'Butter Unsalted 250g',       sku: 'DAI-003', price: 3,   qty: 400,  minThreshold: 80,  type: 'pack', dept: 'Dairy',     cat: 'Butter'        },
      { name: 'Mozzarella 500g',            sku: 'DAI-004', price: 8,   qty: 250,  minThreshold: 40,  type: 'unit', dept: 'Dairy',     cat: 'Cheese'        },
      { name: 'Strawberry Yogurt 6-Pack',   sku: 'DAI-005', price: 6,   qty: 180,  minThreshold: 30,  type: 'pack', dept: 'Dairy',     cat: 'Yogurt'        },
      { name: 'Orange Juice 1L',            sku: 'BEV-001', price: 3,   qty: 600,  minThreshold: 100, type: 'unit', dept: 'Beverages', cat: 'Juices'        },
      { name: 'Mineral Water 500ml 24pk',   sku: 'BEV-002', price: 8,   qty: 400,  minThreshold: 80,  type: 'pack', dept: 'Beverages', cat: 'Water'         },
      { name: 'Red Bull 250ml 24pk',        sku: 'BEV-003', price: 36,  qty: 150,  minThreshold: 25,  type: 'pack', dept: 'Beverages', cat: 'Energy Drinks' },
      { name: 'Apple Juice 1L',             sku: 'BEV-004', price: 3,   qty: 500,  minThreshold: 90,  type: 'unit', dept: 'Beverages', cat: 'Juices'        },
      { name: 'Sparkling Water 1L',         sku: 'BEV-005', price: 2,   qty: 700,  minThreshold: 120, type: 'unit', dept: 'Beverages', cat: 'Water'         },
      { name: 'Basmati Rice 5kg',           sku: 'DRY-001', price: 9,   qty: 350,  minThreshold: 60,  type: 'bag',  dept: 'Dry Goods', cat: 'Grains'        },
      { name: 'Spaghetti 500g',             sku: 'DRY-002', price: 2,   qty: 800,  minThreshold: 150, type: 'pack', dept: 'Dry Goods', cat: 'Pasta'         },
      { name: 'Canned Tomatoes 400g',       sku: 'DRY-003', price: 2,   qty: 1000, minThreshold: 200, type: 'unit', dept: 'Dry Goods', cat: 'Canned Goods'  },
      { name: 'Oats 1kg',                   sku: 'DRY-004', price: 4,   qty: 420,  minThreshold: 70,  type: 'bag',  dept: 'Dry Goods', cat: 'Grains'        },
      { name: 'Penne Pasta 500g',           sku: 'DRY-005', price: 2,   qty: 650,  minThreshold: 100, type: 'pack', dept: 'Dry Goods', cat: 'Pasta'         },
    ],
  },
  {
    code: 'BLDG01',
    name: 'BuildRight Materials',
    description: 'Construction materials and supplies distribution.',
    industry: 'Construction',
    baseCurrency: 'USD',
    primaryColor: '#f59e0b',
    departments: [
      { name: 'Structural', nameEn: 'Structural', color: '#f59e0b' },
      { name: 'Finishing',  nameEn: 'Finishing',  color: '#ef4444' },
      { name: 'Electrical', nameEn: 'Electrical', color: '#8b5cf6' },
    ],
    categories: {
      'Structural': ['Cement', 'Steel', 'Lumber'],
      'Finishing':  ['Paint', 'Tiles', 'Flooring'],
      'Electrical': ['Cables', 'Conduits', 'Fixtures'],
    },
    items: [
      { name: 'Portland Cement 50kg Bag',   sku: 'BLD-STR-001', price: 12,  qty: 500,  minThreshold: 80,  type: 'bag',  dept: 'Structural', cat: 'Cement'   },
      { name: 'Rebar Steel 12mm 6m',        sku: 'BLD-STR-002', price: 18,  qty: 300,  minThreshold: 50,  type: 'unit', dept: 'Structural', cat: 'Steel'    },
      { name: 'Pine Timber 2x4x8ft',        sku: 'BLD-STR-003', price: 8,   qty: 800,  minThreshold: 150, type: 'unit', dept: 'Structural', cat: 'Lumber'   },
      { name: 'Concrete Block 20x40x20cm',  sku: 'BLD-STR-004', price: 2,   qty: 2000, minThreshold: 400, type: 'unit', dept: 'Structural', cat: 'Cement'   },
      { name: 'Steel I-Beam 150x150x6m',    sku: 'BLD-STR-005', price: 220, qty: 45,   minThreshold: 8,   type: 'unit', dept: 'Structural', cat: 'Steel'    },
      { name: 'Interior Wall Paint 20L',    sku: 'BLD-FIN-001', price: 55,  qty: 120,  minThreshold: 20,  type: 'unit', dept: 'Finishing',  cat: 'Paint'    },
      { name: 'Porcelain Floor Tile 60x60', sku: 'BLD-FIN-002', price: 22,  qty: 600,  minThreshold: 100, type: 'box',  dept: 'Finishing',  cat: 'Tiles'    },
      { name: 'Laminate Flooring 2.5m2 pk', sku: 'BLD-FIN-003', price: 35,  qty: 200,  minThreshold: 30,  type: 'pack', dept: 'Finishing',  cat: 'Flooring' },
      { name: 'Exterior Masonry Paint 15L', sku: 'BLD-FIN-004', price: 68,  qty: 80,   minThreshold: 15,  type: 'unit', dept: 'Finishing',  cat: 'Paint'    },
      { name: 'Ceramic Wall Tile 30x60',    sku: 'BLD-FIN-005', price: 16,  qty: 750,  minThreshold: 120, type: 'box',  dept: 'Finishing',  cat: 'Tiles'    },
      { name: 'NYM Cable 3x2.5mm 100m',     sku: 'BLD-ELC-001', price: 95,  qty: 80,   minThreshold: 12,  type: 'roll', dept: 'Electrical', cat: 'Cables'   },
      { name: 'PVC Conduit 20mm 3m',        sku: 'BLD-ELC-002', price: 3,   qty: 1000, minThreshold: 200, type: 'unit', dept: 'Electrical', cat: 'Conduits' },
      { name: 'LED Batten Fixture 120cm',   sku: 'BLD-ELC-003', price: 28,  qty: 150,  minThreshold: 25,  type: 'unit', dept: 'Electrical', cat: 'Fixtures' },
      { name: 'NYY Cable 4x4mm 50m',        sku: 'BLD-ELC-004', price: 140, qty: 35,   minThreshold: 6,   type: 'roll', dept: 'Electrical', cat: 'Cables'   },
      { name: 'Flush Downlight 10W',        sku: 'BLD-ELC-005', price: 14,  qty: 400,  minThreshold: 60,  type: 'unit', dept: 'Electrical', cat: 'Fixtures' },
    ],
  },
];

const STAFF_TEMPLATES = [
  { suffix: 'admin',     role: 'admin',     namePrefix: 'Admin'     },
  { suffix: 'manager',   role: 'manager',   namePrefix: 'Manager'   },
  { suffix: 'warehouse', role: 'warehouse', namePrefix: 'Warehouse' },
  { suffix: 'viewer',    role: 'viewer',    namePrefix: 'Viewer'    },
];

// ── main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  // 1. Enterprise user
  let enterpriseUser = await User.findOne({ isEnterprise: true, username: 'enterprise' });
  if (!enterpriseUser) {
    enterpriseUser = await User.create({
      name:         'Mohammed Hassan',
      nameEn:       'Mohammed Hassan',
      username:     'enterprise',
      email:        'enterprise@nexinv.app',
      passwordHash: await hash('Pass1234'),
      role:         'owner',
      isEnterprise: true,
      active:       true,
    });
    console.log('✓ Enterprise user created  (enterprise / Pass1234)');
  } else {
    console.log('• Enterprise user already exists — skipping');
  }

  // 2. Companies + per-company data
  for (const bp of COMPANIES) {
    console.log(`\n── ${bp.name} (${bp.code}) ─────────`);

    // Company
    let company = await Company.findOne({ code: bp.code });
    if (!company) {
      company = await Company.create({
        code: bp.code, name: bp.name, description: bp.description,
        industry: bp.industry, baseCurrency: bp.baseCurrency,
        primaryColor: bp.primaryColor, active: true,
      });
      console.log('  ✓ Company created');
    } else {
      console.log('  • Company exists — reusing');
    }

    // Link to enterprise user
    await User.updateOne({ _id: enterpriseUser._id }, { $addToSet: { ownedCompanies: company._id } });

    // Owner
    const ownerUsername = bp.code.toLowerCase() + '_owner';
    let owner = await User.findOne({ companyId: company._id, username: ownerUsername });
    if (!owner) {
      owner = await User.create({
        companyId: company._id,
        name: `${bp.name} Owner`, nameEn: `${bp.name} Owner`,
        username: ownerUsername,
        email: `owner@${bp.code.toLowerCase()}.com`,
        passwordHash: await hash('Pass1234'),
        role: 'owner', active: true,
      });
      console.log(`  ✓ Owner: ${ownerUsername} / Pass1234`);
    }

    // Staff
    for (const tmpl of STAFF_TEMPLATES) {
      const uname = `${bp.code.toLowerCase()}_${tmpl.suffix}`;
      const exists = await User.findOne({ companyId: company._id, username: uname });
      if (!exists) {
        await User.create({
          companyId: company._id,
          name: `${tmpl.namePrefix} — ${bp.name}`, nameEn: `${tmpl.namePrefix} — ${bp.name}`,
          username: uname,
          email: `${tmpl.suffix}@${bp.code.toLowerCase()}.com`,
          passwordHash: await hash('Pass1234'),
          role: tmpl.role, active: true,
        });
      }
    }
    console.log('  ✓ Staff users (admin / manager / warehouse / viewer — all Pass1234)');

    // Departments
    const deptMap = {};
    for (const d of bp.departments) {
      let dept = await Department.findOne({ companyId: company._id, name: d.name });
      if (!dept) dept = await Department.create({ companyId: company._id, ...d, active: true });
      deptMap[d.name] = dept._id;
    }
    console.log(`  ✓ ${bp.departments.length} departments`);

    // Categories
    const catMap = {};
    for (const [deptName, catNames] of Object.entries(bp.categories)) {
      for (const catName of catNames) {
        let cat = await Category.findOne({ companyId: company._id, name: catName });
        if (!cat) cat = await Category.create({ companyId: company._id, name: catName, nameEn: catName, deptId: deptMap[deptName], active: true });
        catMap[catName] = cat._id;
      }
    }
    console.log('  ✓ Categories created');

    // Items
    const itemMap = {};
    for (const it of bp.items) {
      let item = await Item.findOne({ companyId: company._id, sku: it.sku });
      if (!item) {
        item = await Item.create({
          companyId: company._id,
          name: it.name, nameEn: it.name, sku: it.sku,
          price: it.price, qty: it.qty, minThreshold: it.minThreshold,
          type: it.type, deptId: deptMap[it.dept], catId: catMap[it.cat],
          status: 'active',
        });
      }
      itemMap[it.sku] = item._id;
    }
    console.log(`  ✓ ${bp.items.length} items`);

    // Transactions
    const existingTx = await Transaction.countDocuments({ companyId: company._id });
    if (existingTx === 0) {
      const itemIds = Object.values(itemMap);
      const sources = ['Supplier A', 'Supplier B', 'Supplier C', 'Central Warehouse', 'Direct Import'];
      const dests   = ['Showroom', 'Site A', 'Site B', 'Client Delivery', 'Main Store'];
      const txDocs  = [];

      for (let i = 0; i < 50; i++) {
        const type = i % 3 === 0 ? 'OUT' : 'IN';
        txDocs.push({
          companyId: company._id,
          type,
          itemId:   pick(itemIds),
          qty:      rnd(1, 20),
          source:   type === 'IN'  ? pick(sources) : undefined,
          dest:     type === 'OUT' ? pick(dests)   : undefined,
          userId:   owner._id,
          userName: owner.name,
          date:     daysAgo(rnd(0, 60)),
          notes:    `Seed tx #${i + 1}`,
        });
      }
      await Transaction.insertMany(txDocs);
      console.log('  ✓ 50 transactions (spread over last 60 days)');
    } else {
      console.log(`  • Transactions already exist (${existingTx}) — skipping`);
    }
  }

  console.log('\n✅ Seed complete!\n');
  console.log('─────────────────────────────────────────────');
  console.log('Enterprise :  enterprise         /  Pass1234');
  console.log('Owners     :  tech01_owner etc.  /  Pass1234');
  console.log('Staff      :  tech01_admin  etc. /  Pass1234');
  console.log('─────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
