/**
 * seedData — idempotent demo data seeder called by the server on first connect.
 * Creates seed company NEX-01, default users, departments, categories, and items
 * only if they don't already exist. Safe to call on every startup.
 *
 * The standalone seed.js script (npm run seed) is separate — use it to wipe & rebuild.
 */

const bcrypt = require("bcryptjs");
const { Company, User, Department, Category, Item } = require("./models");

async function seedData() {
  // 1️⃣  Drop the old global username unique index (replaced by per-company compound index)
  try {
    await User.collection.dropIndex("username_1");
    console.log("🗑️  Dropped legacy global username index");
  } catch { /* index may not exist — that's fine */ }

  // 2️⃣  Ensure seed company exists
  let company = await Company.findOne({ code: "NEX-01" });
  if (!company) {
    company = await Company.create({
      code: "NEX-01", name: "NexINV Default Company",
      baseCurrency: "USD", theme: "light", activeIconPack: "material", primaryColor: "#3b82f6",
    });
    console.log("🌱 Created seed company NEX-01");
  }

  // 3️⃣  If admin already exists, we're done
  const adminExists = await User.findOne({ companyId: company._id, username: "admin" });
  if (adminExists) {
    console.log("✅ Seed ready — login: NEX-01 / admin / admin");
    return;
  }

  console.log("🌱 Seeding users and demo data...");

  const passwordHash = await bcrypt.hash("admin", 12);
  try {
    await User.insertMany([
      { companyId: company._id, name: "مدير النظام",    nameEn: "System Admin",   username: "admin",  passwordHash,                               role: "owner"     },
      { companyId: company._id, name: "أحمد محمد",      nameEn: "Ahmed Mohamed",  username: "ahmed",  passwordHash: await bcrypt.hash("123", 12), role: "manager"   },
      { companyId: company._id, name: "سارة علي",       nameEn: "Sara Ali",       username: "sara",   passwordHash: await bcrypt.hash("123", 12), role: "warehouse" },
      { companyId: company._id, name: "خالد عمر",       nameEn: "Khaled Omar",    username: "khaled", passwordHash: await bcrypt.hash("123", 12), role: "viewer"    },
    ], { ordered: false });
  } catch (e) {
    if (e.code !== 11000) throw e;
    console.warn("⚠️  Some seed users already existed");
  }

  const depts = await Department.create([
    { companyId: company._id, name: "كهربائي",         nameEn: "Electrical",   color: "#f59e0b" },
    { companyId: company._id, name: "ميكانيكي",        nameEn: "Mechanical",   color: "#3b82f6" },
    { companyId: company._id, name: "هيدروليكي",       nameEn: "Hydraulic",    color: "#06b6d4" },
    { companyId: company._id, name: "تقنية المعلومات", nameEn: "IT",           color: "#8b5cf6" },
    { companyId: company._id, name: "مواد البناء",     nameEn: "Construction", color: "#f97316" },
  ]);

  const cats = await Category.create([
    { companyId: company._id, name: "محركات",  nameEn: "Motors",   deptId: depts[0]._id },
    { companyId: company._id, name: "كابلات",  nameEn: "Cables",   deptId: depts[0]._id },
    { companyId: company._id, name: "مضخات",   nameEn: "Pumps",    deptId: depts[1]._id },
    { companyId: company._id, name: "تروس",    nameEn: "Gears",    deptId: depts[1]._id },
    { companyId: company._id, name: "صمامات",  nameEn: "Valves",   deptId: depts[2]._id },
    { companyId: company._id, name: "أجهزة",   nameEn: "Hardware", deptId: depts[3]._id },
    { companyId: company._id, name: "أنابيب",  nameEn: "Pipes",    deptId: depts[4]._id },
  ]);

  await Item.create([
    { companyId: company._id, name: "محرك كهربائي 5HP",  nameEn: "Electric Motor 5HP",  deptId: depts[0]._id, catId: cats[0]._id, sku: "EM-001", barcode: "6221023001001", price: 4500,  qty: 24,  minThreshold: 5,   type: "unit", status: "active", description: "محرك ثلاثي الأوجه للاستخدام الصناعي", photo: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop" },
    { companyId: company._id, name: "مضخة هيدروليكية",   nameEn: "Hydraulic Pump",       deptId: depts[2]._id, catId: cats[4]._id, sku: "HP-002", barcode: "6221023001002", price: 8200,  qty: 3,   minThreshold: 5,   type: "unit", status: "active", description: "مضخة طرد مركزي عالية الضغط",           photo: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop" },
    { companyId: company._id, name: "كابل نحاسي 16مم",   nameEn: "Copper Cable 16mm",    deptId: depts[0]._id, catId: cats[1]._id, sku: "CC-003", barcode: "6221023001003", price: 85,    qty: 800, minThreshold: 100, type: "roll", status: "active", description: "كابل طاقة للمتر",                         photo: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop" },
    { companyId: company._id, name: "صمام فراشة DN80",   nameEn: "Butterfly Valve DN80", deptId: depts[2]._id, catId: cats[4]._id, sku: "BV-004", barcode: "6221023001004", price: 1800,  qty: 0,   minThreshold: 10,  type: "unit", status: "active", description: "صمام صناعي PN16" },
    { companyId: company._id, name: "وحدة تخزين 32TB",   nameEn: "NAS Storage 32TB",     deptId: depts[3]._id, catId: cats[5]._id, sku: "NS-005", barcode: "6221023001005", price: 35000, qty: 4,   minThreshold: 2,   type: "unit", status: "active", description: "وحدة تخزين شبكية",                        photo: "https://images.unsplash.com/photo-1558564030-22c6e6e226a2?w=400&h=300&fit=crop" },
    { companyId: company._id, name: "علبة تروس صناعية",  nameEn: "Industrial Gearbox",   deptId: depts[1]._id, catId: cats[3]._id, sku: "GB-006", barcode: "6221023001006", price: 12000, qty: 7,   minThreshold: 3,   type: "unit", status: "active", description: "علبة تروس للماكينات الثقيلة" },
  ]);

  console.log("🌱 Demo data seeded — login: NEX-01 / admin / admin");
}

module.exports = seedData;
