const request = require("supertest");
const db = require("./helpers/db");
const { buildApp, makeCompany, makeUser, makeItem } = require("./helpers/app");
const { Item, Transaction, Ledger } = require("../models");

let app, company, admin;

beforeAll(async () => {
  await db.connect();
  app = buildApp();
});
afterAll(async () => db.disconnect());

beforeEach(async () => {
  await db.clear();
  company = await makeCompany();
  admin = await makeUser(company, { role: "admin" });
});

const post = (token, body) =>
  request(app).post("/api/transactions").set("Authorization", `Bearer ${token}`).send(body);
const cancel = (token, id, body = { status: "cancelled" }) =>
  request(app).put(`/api/transactions/${id}`).set("Authorization", `Bearer ${token}`).send(body);

describe("POST /api/transactions — stock math", () => {
  test("IN increases qty and writes a matching ledger row", async () => {
    const item = await makeItem(company, { qty: 5 });
    const res = await post(admin.token, { type: "IN", itemId: item._id, qty: 10 });

    expect(res.status).toBe(201);
    expect(res.body.updatedQty).toBe(15);

    const fresh = await Item.findById(item._id);
    expect(fresh.qty).toBe(15);

    const ledger = await Ledger.find({ itemId: item._id });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ type: "IN", qtyChange: 10, qtyBefore: 5, qtyAfter: 15 });
  });

  test("OUT decreases qty; insufficient stock is rejected atomically with 400", async () => {
    const item = await makeItem(company, { qty: 3 });

    const ok = await post(admin.token, { type: "OUT", itemId: item._id, qty: 2 });
    expect(ok.status).toBe(201);
    expect(ok.body.updatedQty).toBe(1);

    const fail = await post(admin.token, { type: "OUT", itemId: item._id, qty: 5 });
    expect(fail.status).toBe(400);
    expect(fail.body.message).toMatch(/insufficient stock/i);

    // Nothing from the failed request may persist
    const fresh = await Item.findById(item._id);
    expect(fresh.qty).toBe(1);
    expect(await Transaction.countDocuments({ itemId: item._id })).toBe(1);
    expect(await Ledger.countDocuments({ itemId: item._id })).toBe(1);
  });

  test("zero or negative quantity is rejected with 400", async () => {
    const item = await makeItem(company, { qty: 5 });
    const res = await post(admin.token, { type: "IN", itemId: item._id, qty: 0 });
    expect(res.status).toBe(400);
    expect((await Item.findById(item._id)).qty).toBe(5);
  });

  test("moving-average cost: 10 @ 5 then 10 @ 10 → avgCost 7.5", async () => {
    const item = await makeItem(company, { qty: 0, avgCost: 0 });

    await post(admin.token, { type: "IN", itemId: item._id, qty: 10, unitCost: 5 });
    expect((await Item.findById(item._id)).avgCost).toBe(5);

    await post(admin.token, { type: "IN", itemId: item._id, qty: 10, unitCost: 10 });
    expect((await Item.findById(item._id)).avgCost).toBe(7.5);
  });

  test("multi-item transaction shares one invoiceNo and fails as a unit", async () => {
    const a = await makeItem(company, { name: "A", qty: 10 });
    const b = await makeItem(company, { name: "B", qty: 1 });

    const ok = await post(admin.token, {
      type: "OUT",
      items: [{ itemId: a._id, qty: 2 }, { itemId: b._id, qty: 1 }],
    });
    expect(ok.status).toBe(201);
    const invoices = new Set(ok.body.transactions.map(t => t.invoiceNo));
    expect(invoices.size).toBe(1);

    // Second item insufficient → whole request rolls back, including item A
    const fail = await post(admin.token, {
      type: "OUT",
      items: [{ itemId: a._id, qty: 2 }, { itemId: b._id, qty: 99 }],
    });
    expect(fail.status).toBe(400);
    expect((await Item.findById(a._id)).qty).toBe(8); // unchanged since the successful tx
  });

  test("ledger-sum invariant: Σ qtyChange equals item.qty minus starting qty", async () => {
    const item = await makeItem(company, { qty: 0 });

    await post(admin.token, { type: "IN", itemId: item._id, qty: 20 });
    await post(admin.token, { type: "OUT", itemId: item._id, qty: 7 });
    await post(admin.token, { type: "IN", itemId: item._id, qty: 4 });
    await post(admin.token, { type: "OUT", itemId: item._id, qty: 30 }); // rejected

    const ledger = await Ledger.find({ itemId: item._id });
    const sum = ledger.reduce((acc, l) => acc + l.qtyChange, 0);
    const fresh = await Item.findById(item._id);
    expect(sum).toBe(fresh.qty); // started at 0
    expect(fresh.qty).toBe(17);
  });
});

describe("PUT /api/transactions/:id — soft cancel", () => {
  test("cancelling an IN reverses stock and writes a CANCEL ledger row", async () => {
    const item = await makeItem(company, { qty: 0 });
    const created = await post(admin.token, { type: "IN", itemId: item._id, qty: 10 });
    const txId = created.body.transaction._id;

    const res = await cancel(admin.token, txId);
    expect(res.status).toBe(200);
    expect(res.body.updatedQty).toBe(0);

    const ledger = await Ledger.find({ itemId: item._id }).sort({ createdAt: 1 });
    expect(ledger).toHaveLength(2);
    expect(ledger[1]).toMatchObject({ type: "CANCEL", qtyChange: -10, qtyBefore: 10, qtyAfter: 0 });

    // Invariant holds after cancel too
    const sum = ledger.reduce((a, l) => a + l.qtyChange, 0);
    expect(sum).toBe((await Item.findById(item._id)).qty);
  });

  test("cancelling an OUT restores stock", async () => {
    const item = await makeItem(company, { qty: 10 });
    const created = await post(admin.token, { type: "OUT", itemId: item._id, qty: 4 });
    const res = await cancel(admin.token, created.body.transaction._id);
    expect(res.status).toBe(200);
    expect((await Item.findById(item._id)).qty).toBe(10);
  });

  test("double-cancel is rejected with 400 and does not double-restore", async () => {
    const item = await makeItem(company, { qty: 10 });
    const created = await post(admin.token, { type: "OUT", itemId: item._id, qty: 4 });
    await cancel(admin.token, created.body.transaction._id);

    const again = await cancel(admin.token, created.body.transaction._id);
    expect(again.status).toBe(400);
    expect((await Item.findById(item._id)).qty).toBe(10);
  });

  test("cancelling an IN whose stock was already consumed is rejected", async () => {
    const item = await makeItem(company, { qty: 0 });
    const inTx = await post(admin.token, { type: "IN", itemId: item._id, qty: 10 });
    await post(admin.token, { type: "OUT", itemId: item._id, qty: 8 }); // only 2 left

    const res = await cancel(admin.token, inTx.body.transaction._id);
    expect(res.status).toBe(400);
    expect((await Item.findById(item._id)).qty).toBe(2);
  });
});

describe("permissions and tenant isolation", () => {
  test("viewer cannot record transactions (403)", async () => {
    const viewer = await makeUser(company, { role: "viewer" });
    const item = await makeItem(company, { qty: 5 });
    const res = await post(viewer.token, { type: "OUT", itemId: item._id, qty: 1 });
    expect(res.status).toBe(403);
  });

  test("a user cannot transact another company's item (404)", async () => {
    const otherCompany = await makeCompany();
    const foreignItem = await makeItem(otherCompany, { qty: 50 });

    const res = await post(admin.token, { type: "OUT", itemId: foreignItem._id, qty: 1 });
    expect(res.status).toBe(404);
    expect((await Item.findById(foreignItem._id)).qty).toBe(50);
  });
});
