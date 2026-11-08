// Minimal express app for route tests: real routers, real auth middleware,
// no Socket.IO and no listening server.
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-for-jest-only";

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { SECRET } = require("../../middleware/auth");
const { Company, User, Item } = require("../../models");

function buildApp() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use("/api/transactions", require("../../routes/transactions"));
  app.use("/api/purchase-orders", require("../../routes/purchaseOrders"));
  app.use("/api/auth", require("../../routes/auth"));
  app.use("/api/users", require("../../routes/users"));
  app.use("/api/company", require("../../routes/company"));
  app.use("/api/items", require("../../routes/items"));
  app.use("/api/batches", require("../../routes/batches"));
  return app;
}

// ── Fixture builders ──────────────────────────────────────────────────────────

async function makeCompany(overrides = {}) {
  return Company.create({
    code: overrides.code || "TST-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
    name: overrides.name || "Test Co",
    ...overrides,
  });
}

async function makeUser(company, overrides = {}) {
  const user = await User.create({
    companyId: company._id,
    name: overrides.name || "Test User",
    username: overrides.username || "user" + Math.random().toString(36).slice(2, 8),
    passwordHash: await bcrypt.hash(overrides.password || "pass123", 4),
    role: overrides.role || "admin",
    ...overrides,
  });
  const token = jwt.sign({ id: user._id, companyId: company._id }, SECRET, { expiresIn: "1h" });
  return { user, token };
}

async function makeItem(company, overrides = {}) {
  return Item.create({
    companyId: company._id,
    name: overrides.name || "Test Item",
    qty: overrides.qty ?? 0,
    ...overrides,
  });
}

module.exports = { buildApp, makeCompany, makeUser, makeItem };
