/**
 * seed-transactions.js — Rich IN/OUT transaction history for enterprise companies
 * Run: node seed-transactions.js
 *
 * Adds 120 realistic transactions per company (360 total) across 90 days.
 * Clears the previous 50 generic ones first, then inserts a realistic
 * pattern: bulk stock-ins on Mon/Thu, steady daily outbound orders.
 */

require('dotenv').config();
const mongoose    = require('mongoose');
const Company     = require('./models/Company');
const User        = require('./models/User');
const Item        = require('./models/Item');
const Transaction = require('./models/Transaction');

// ── helpers ───────────────────────────────────────────────────────────────────
const pick    = arr => arr[Math.floor(Math.random() * arr.length)];
const rnd     = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Return a Date N days ago at a realistic working hour */
function workDate(daysAgo, hourMin = 8, hourMax = 17) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(rnd(hourMin, hourMax), rnd(0, 59), rnd(0, 59), 0);
  return d;
}

// ── per-company transaction blueprints ───────────────────────────────────────
const BLUEPRINTS = {
  TECH01: {
    suppliers: ['Dell EMEA',      'Cisco Systems',   'Logitech MENA', 'Samsung B2B',  'Kingston Direct'],
    customers: ['TechHub Cairo',  'IT Solutions LLC','DataCenter Co', 'Gulf Networks','Smart Office'],
    notes: {
      IN:  ['Restocking order',   'Monthly bulk delivery', 'Urgent replenishment', 'Seasonal stock-up',    'Supplier promotion order'],
      OUT: ['Customer PO #',      'Project delivery',      'Showroom transfer',    'Workshop consignment', 'Direct client order'],
    },
  },
  FOOD01: {
    suppliers: ['Fresh Farm Co',  'Dairy Direct',    'Beverage World', 'Grain Masters',  'Cold Chain Ltd'],
    customers: ['Al-Nour Market', 'FreshMart Hyper', 'Grand Hotel',    'Quick Bites LLC','School Canteen'],
    notes: {
      IN:  ['Daily fresh delivery','Weekly bulk order','Cold chain receipt','Promotional stock','Seasonal purchase'],
      OUT: ['Restaurant order',    'Supermarket PO',  'Catering delivery', 'Weekly standing order','Express order'],
    },
  },
  BLDG01: {
    suppliers: ['Cairo Steel Co', 'ProCement Egypt', 'ElectroPro',     'TimberLine',     'PaintHouse Ltd'],
    customers: ['BuildMax Contr', 'Nile Projects',   'Urban Develop.',  'Site Manager A', 'Al-Masry Works'],
    notes: {
      IN:  ['Site material order', 'Project bulk delivery','Emergency stock','Quarterly purchase','Supplier promo'],
      OUT: ['Site delivery',       'Contractor PO #',      'Project consignment','Sub-contractor supply','Direct site order'],
    },
  },
};

// ── Build a realistic 90-day transaction schedule ────────────────────────────
function buildSchedule(items, enterprise, owner, companyId, code) {
  const bp   = BLUEPRINTS[code];
  const docs = [];

  // ── 1. Weekly large IN batches (every Mon & Thu for 13 weeks = 26 bulk days)
  for (let week = 0; week < 13; week++) {
    for (const bulkDay of [0, 3]) { // 0 = Mon offset, 3 = Thu offset
      const daysAgo = week * 7 + bulkDay;
      if (daysAgo > 90) continue;

      // 3-5 different items received per bulk day
      const batchItems = [...items].sort(() => Math.random() - 0.5).slice(0, rnd(3, 5));
      for (const item of batchItems) {
        docs.push({
          companyId,
          type:     'IN',
          itemId:   item._id,
          qty:      rnd(20, 80),
          source:   pick(bp.suppliers),
          userId:   enterprise._id,
          userName: enterprise.name,
          date:     workDate(daysAgo, 7, 10), // morning delivery
          notes:    pick(bp.notes.IN),
        });
      }
    }
  }

  // ── 2. Daily outbound orders (every working day for 60 days)
  for (let d = 0; d < 60; d++) {
    const dow = new Date(Date.now() - d * 86_400_000).getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends

    // 1-3 outbound transactions per working day
    const count = rnd(1, 3);
    for (let i = 0; i < count; i++) {
      const item = pick(items);
      const poNum = rnd(1000, 9999);
      docs.push({
        companyId,
        type:     'OUT',
        itemId:   item._id,
        qty:      rnd(1, 15),
        dest:     pick(bp.customers),
        userId:   enterprise._id,
        userName: enterprise.name,
        date:     workDate(d, 10, 16), // business hours
        notes:    `${pick(bp.notes.OUT)}${bp.notes.OUT.indexOf(pick(bp.notes.OUT)) < 2 ? poNum : ''}`,
      });
    }
  }

  // ── 3. Mid-month spot stock-ins (random restocks not on bulk days)
  for (let i = 0; i < 15; i++) {
    const item = pick(items);
    docs.push({
      companyId,
      type:     'IN',
      itemId:   item._id,
      qty:      rnd(5, 30),
      source:   pick(bp.suppliers),
      userId:   owner._id,         // owner did these
      userName: owner.name,
      date:     workDate(rnd(1, 88), 8, 12),
      notes:    'Spot restock',
    });
  }

  // ── 4. Returns / adjustments (OUT, small qty, labelled as returns)
  for (let i = 0; i < 8; i++) {
    const item = pick(items);
    docs.push({
      companyId,
      type:     'OUT',
      itemId:   item._id,
      qty:      rnd(1, 5),
      dest:     pick(bp.suppliers),
      userId:   owner._id,
      userName: owner.name,
      date:     workDate(rnd(1, 60), 9, 15),
      notes:    'Supplier return — defective batch',
    });
  }

  return docs;
}

// ── main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log('Connecting…');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  const enterprise = await User.findOne({ username: 'enterprise' });
  if (!enterprise) { console.error('Enterprise user not found — run seed.js first'); process.exit(1); }

  const codes = ['TECH01', 'FOOD01', 'BLDG01'];

  for (const code of codes) {
    const company = await Company.findOne({ code });
    if (!company) { console.log(`${code} not found — skipping`); continue; }

    const owner = await User.findOne({ companyId: company._id, role: 'owner' });
    const items = await Item.find({ companyId: company._id });

    // Clear old generic transactions
    const deleted = await Transaction.deleteMany({ companyId: company._id });
    console.log(`${code}: cleared ${deleted.deletedCount} old transactions`);

    // Build and insert new ones
    const docs = buildSchedule(items, enterprise, owner, company._id, code);
    await Transaction.insertMany(docs);
    console.log(`${code}: inserted ${docs.length} transactions\n`);
  }

  // Summary
  for (const code of codes) {
    const company = await Company.findOne({ code });
    const total   = await Transaction.countDocuments({ companyId: company._id });
    const inCount = await Transaction.countDocuments({ companyId: company._id, type: 'IN' });
    const outCount= await Transaction.countDocuments({ companyId: company._id, type: 'OUT' });
    console.log(`${code}  →  total: ${total}  |  IN: ${inCount}  |  OUT: ${outCount}`);
  }

  console.log('\n✅ Done.\n');
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
