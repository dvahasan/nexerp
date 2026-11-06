const request = require("supertest");
const express = require("express");
const db = require("./helpers/db");
const { makeCompany, makeUser, makeItem } = require("./helpers/app");

let app, company, admin;

beforeAll(async () => {
  await db.connect();
  app = express();
  app.use(express.json());
  app.use("/api/items", require("../routes/items"));
});
afterAll(async () => db.disconnect());

beforeEach(async () => {
  await db.clear();
  company = await makeCompany();
  admin = await makeUser(company, { role: "admin" });
});

test("reorder suggestions list items at/below their reorder point with urgency and cost", async () => {
  await makeItem(company, { name: "Healthy", qty: 50, reorderPoint: 10 });
  await makeItem(company, { name: "Low", qty: 4, reorderPoint: 10, reorderQty: 25, avgCost: 2, minThreshold: 5 });
  await makeItem(company, { name: "Out", qty: 0, reorderPoint: 10, avgCost: 3 });
  await makeItem(company, { name: "NoRule", qty: 0 }); // reorderPoint 0 → excluded

  const res = await request(app)
    .get("/api/items/reorder/suggestions")
    .set("Authorization", `Bearer ${admin.token}`);

  expect(res.status).toBe(200);
  expect(res.body.count).toBe(2);

  const low = res.body.suggestions.find(s => s.name === "Low");
  expect(low).toMatchObject({ suggestedQty: 25, estimatedCost: 50, urgency: "high" });

  const out = res.body.suggestions.find(s => s.name === "Out");
  expect(out).toMatchObject({ suggestedQty: 20, urgency: "critical" }); // 2×10 − 0
});

test("reorder suggestions are company-scoped", async () => {
  const other = await makeCompany();
  await makeItem(other, { name: "Foreign", qty: 0, reorderPoint: 5 });

  const res = await request(app)
    .get("/api/items/reorder/suggestions")
    .set("Authorization", `Bearer ${admin.token}`);
  expect(res.body.count).toBe(0);
});
