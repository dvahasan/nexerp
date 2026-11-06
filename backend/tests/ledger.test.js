const request = require("supertest");
const express = require("express");
const db = require("./helpers/db");
const { makeCompany, makeUser, makeItem } = require("./helpers/app");
const { Item } = require("../models");

let app, company, admin;

beforeAll(async () => {
  await db.connect();
  app = express();
  app.use(express.json());
  app.use("/api/transactions", require("../routes/transactions"));
  app.use("/api/ledger", require("../routes/ledger"));
});
afterAll(async () => db.disconnect());

beforeEach(async () => {
  await db.clear();
  company = await makeCompany();
  admin = await makeUser(company, { role: "admin" });
});

const tx = (token, body) =>
  request(app).post("/api/transactions").set("Authorization", `Bearer ${token}`).send(body);

test("GET /api/ledger returns paginated entries for the company", async () => {
  const item = await makeItem(company, { qty: 0 });
  await tx(admin.token, { type: "IN", itemId: item._id, qty: 10 });
  await tx(admin.token, { type: "OUT", itemId: item._id, qty: 3 });

  const res = await request(app).get("/api/ledger").set("Authorization", `Bearer ${admin.token}`);
  expect(res.status).toBe(200);
  expect(res.body.total).toBe(2);
  expect(res.body.entries[0].itemId.name).toBe("Test Item");
});

test("GET /api/ledger/item/:id reports a consistent integrity check", async () => {
  const item = await makeItem(company, { qty: 0 });
  await tx(admin.token, { type: "IN", itemId: item._id, qty: 10 });
  await tx(admin.token, { type: "OUT", itemId: item._id, qty: 4 });

  const res = await request(app)
    .get(`/api/ledger/item/${item._id}`)
    .set("Authorization", `Bearer ${admin.token}`);

  expect(res.status).toBe(200);
  expect(res.body.integrity).toEqual({ ledgerSum: 6, currentQty: 6, consistent: true });
});

test("GET /api/ledger/integrity flags items whose qty was edited outside transactions", async () => {
  const item = await makeItem(company, { qty: 0 });
  await tx(admin.token, { type: "IN", itemId: item._id, qty: 10 });

  // Simulate a direct qty edit that bypasses the ledger
  await Item.findByIdAndUpdate(item._id, { qty: 25 });

  const res = await request(app)
    .get("/api/ledger/integrity")
    .set("Authorization", `Bearer ${admin.token}`);

  expect(res.status).toBe(200);
  expect(res.body.consistent).toBe(false);
  expect(res.body.mismatches).toHaveLength(1);
  expect(res.body.mismatches[0]).toMatchObject({ currentQty: 25, ledgerSum: 10, drift: 15 });
});

test("ledger reads scope to the caller's company", async () => {
  const other = await makeCompany();
  const otherAdmin = await makeUser(other, { role: "admin" });
  const item = await makeItem(company, { qty: 0 });
  await tx(admin.token, { type: "IN", itemId: item._id, qty: 5 });

  const res = await request(app).get("/api/ledger").set("Authorization", `Bearer ${otherAdmin.token}`);
  expect(res.status).toBe(200);
  expect(res.body.total).toBe(0);

  const detail = await request(app)
    .get(`/api/ledger/item/${item._id}`)
    .set("Authorization", `Bearer ${otherAdmin.token}`);
  expect(detail.status).toBe(404);
});

test("integrity report requires admin or owner", async () => {
  const viewer = await makeUser(company, { role: "viewer" });
  const res = await request(app).get("/api/ledger/integrity").set("Authorization", `Bearer ${viewer.token}`);
  expect(res.status).toBe(403);
});
