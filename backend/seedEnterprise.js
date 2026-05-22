require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ── Schemas ───────────────────────────────────────────────────────────────────
const CompanySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  industry: { type: String, default: "" },
  baseCurrency: { type: String, default: "USD" },
  theme: { type: String, default: "light" },
  activeIconPack: { type: String, default: "material" },
  primaryColor: { type: String, default: "#3b82f6" },
  logo: { type: String, default: "" },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  name: { type: String, required: true },
  nameEn: String,
  username: { type: String, required: true, lowercase: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: "" },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["owner","admin","manager","warehouse","viewer"], default: "viewer" },
  permissions: { type: mongoose.Schema.Types.Mixed, default: null },
  preferredLanguage: { type: String, default: "en" },
  isEnterprise: { type: Boolean, default: false },
  ownedCompanies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Company" }],
  active: { type: Boolean, default: true },
}, { timestamps: true });

const Company = mongoose.model("Company", CompanySchema);
const User = mongoose.model("User", UserSchema);

const INDUSTRIES = [
  "Technology & Software",
  "Automotive Manufacturing",
  "Healthcare & Pharmaceuticals",
  "Construction & Real Estate",
  "Retail & E-Commerce",
  "Logistics & Supply Chain",
  "Energy & Utilities",
  "Food & Beverage",
  "Aerospace & Defense",
  "Financial Services"
];

const ROLES = ["admin", "manager", "warehouse", "viewer"];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seedEnterprise() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const hash = await bcrypt.hash("123", 12);

    // 1. Create or Find Enterprise User
    console.log("👔 Setting up Enterprise Owner...");
    let entOwner = await User.findOne({ username: "ent_owner", isEnterprise: true });
    if (!entOwner) {
      entOwner = await User.create({
        name: "Enterprise Owner",
        username: "ent_owner",
        passwordHash: hash,
        role: "owner",
        isEnterprise: true,
        ownedCompanies: []
      });
    }

    const companyIds = [];

    // 2. Create 10 Companies
    console.log("🏢 Creating 10 Companies...");
    for (let i = 0; i < 10; i++) {
      const industry = INDUSTRIES[i];
      const companyCode = `COMP-${i+1}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
      
      const company = await Company.create({
        code: companyCode,
        name: `${industry.split(' ')[0]} Corp`,
        description: `A leading company in the ${industry} sector.`,
        industry: industry,
        primaryColor: ["#3b82f6", "#10b981", "#f43f5e", "#f59e0b", "#8b5cf6"][i % 5]
      });
      
      companyIds.push(company._id);
      console.log(`  Created ${company.name} (${industry})`);

      // 3. Create 10 to 40 employees for this company
      const numEmployees = randomInt(10, 40);
      const employeesToInsert = [];
      
      // Always create a company admin (owner of the single company)
      employeesToInsert.push({
        companyId: company._id,
        name: `Admin of ${company.name}`,
        username: `admin_${i+1}`,
        passwordHash: hash,
        role: "owner"
      });

      for (let j = 0; j < numEmployees - 1; j++) {
        const role = ROLES[randomInt(0, ROLES.length - 1)];
        employeesToInsert.push({
          companyId: company._id,
          name: `Employee ${j+1}`,
          username: `user_${i+1}_${j+1}`,
          passwordHash: hash,
          role: role
        });
      }

      await User.insertMany(employeesToInsert);
      console.log(`    👥 Added ${numEmployees} employees to ${company.name}`);
    }

    // 4. Link Companies to Enterprise Owner
    entOwner.ownedCompanies.push(...companyIds);
    await entOwner.save();
    console.log(`🔗 Linked ${companyIds.length} companies to Enterprise Owner (ent_owner)`);

    console.log("🎉 Seeding complete!");
    console.log("Use username: 'ent_owner', password: '123' to login as Enterprise Owner in the Enterprise Login tab.");
    process.exit(0);

  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

seedEnterprise();
