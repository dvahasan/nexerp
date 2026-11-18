const request = require("supertest");
const express = require("express");
const db = require("./helpers/db");
const { makeCompany, makeUser, makeItem } = require("./helpers/app");
const { Company, Item, Transaction, Ledger } = require("../models");

let app, company, owner;
const API_KEY = "nex_test_key_0123456789abcdef";

beforeAll(async () => {
  await db.connect();
  app = express();
  app.use(express.json());
  app.use("/api/public", require("../routes/publicApi"));
});
afterAll(async () => db.disconnect());

beforeEach(async () => {
  await db.clear();
  company = await makeCompany();
  ({ user: owner } = await makeUser(company, { role: "owner" }));
  await Company.findByIdAndUpdate(company._id, {
    apiKeys: [{ key: API_KEY, name: "test" }],
  });
});

const checkout = (body, key = API_KEY) =>
  request(app).post("/api/public/checkout").set("x-api-key", key).send(body);

describe("API key auth", () => {
  test("missing key → 401, wrong key → 403", async () => {
    expect((await request(app).post("/api/public/checkout").send({})).status).toBe(401);
    expect((await checkout({}, "nex_wrong")).status).toBe(403);
  });

  test("GET /api/public/items returns stock for a valid key", async () => {
    await makeItem(company, { name: "Widget", sku: "W-1", qty: 7 });
    const res = await request(app).get("/api/public/items").set("x-api-key", API_KEY);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).toMatchObject({ sku: "W-1", qty: 7 });
  });
});

describe("POST /api/public/checkout", () => {
  test("decrements stock, writes tx + ledger attributed to the owner", async () => {
    const item = await makeItem(company, { name: "Widget", sku: "W-1", qty: 10 });

    const res = await checkout({
      externalSystem: "Shopify",
      externalOrderId: "ord_1",
      idempotencyKey: "idem-1",
      items: [{ sku: "W-1", qty: 3 }],
    });

    expect(res.status).toBe(201);
    expect((await Item.findById(item._id)).qty).toBe(7);

    const tx = await Transaction.findOne({ companyId: company._id });
    expect(tx.userId.toString()).toBe(owner._id.toString());
    expect(tx.idempotencyKey).toBe("idem-1");

    const ledger = await Ledger.findOne({ companyId: company._id });
    expect(ledger).toMatchObject({ type: "OUT", qtyChange: -3, qtyBefore: 10, qtyAfter: 7 });
  });

  test("replaying the same idempotencyKey does not double-decrement", async () => {
    const item = await makeItem(company, { name: "Widget", sku: "W-1", qty: 10 });
    const body = { idempotencyKey: "idem-dup", items: [{ sku: "W-1", qty: 3 }] };

    const first = await checkout(body);
    expect(first.status).toBe(201);

    const replay = await checkout(body);
    expect(replay.status).toBe(200);
    expect(replay.body.message).toMatch(/already processed/i);
    expect(replay.body.invoiceNo).toBe(first.body.invoiceNo);

    expect((await Item.findById(item._id)).qty).toBe(7);
    expect(await Transaction.countDocuments({ companyId: company._id })).toBe(1);
  });

  test("insufficient stock → 400 and full rollback", async () => {
    const a = await makeItem(company, { name: "A", sku: "A-1", qty: 10 });
    const b = await makeItem(company, { name: "B", sku: "B-1", qty: 1 });

    const res = await checkout({
      idempotencyKey: "idem-roll",
      items: [{ sku: "A-1", qty: 2 }, { sku: "B-1", qty: 5 }],
    });

    expect(res.status).toBe(400);
    expect((await Item.findById(a._id)).qty).toBe(10);
    expect((await Item.findById(b._id)).qty).toBe(1);
    expect(await Transaction.countDocuments({ companyId: company._id })).toBe(0);
  });

  test("missing idempotencyKey → 400", async () => {
    await makeItem(company, { name: "Widget", sku: "W-1", qty: 10 });
    const res = await checkout({ items: [{ sku: "W-1", qty: 1 }] });
    expect(res.status).toBe(400);
  });

  test("keys cannot read another company's stock", async () => {
    const other = await makeCompany();
    await makeItem(other, { name: "Foreign", sku: "F-1", qty: 99 });

    const res = await checkout({ idempotencyKey: "idem-x", items: [{ sku: "F-1", qty: 1 }] });
    expect(res.status).toBe(404);
    const listing = await request(app).get("/api/public/items").set("x-api-key", API_KEY);
    expect(listing.body.total).toBe(0);
  });
});
