const request = require("supertest");
const db = require("./helpers/db");
const { buildApp, makeCompany, makeUser, makeItem } = require("./helpers/app");
const { Item, Transaction, Ledger, Batch, Alert } = require("../models");

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
const cancel = (token, id) =>
  request(app).put(`/api/transactions/${id}`).set("Authorization", `Bearer ${token}`).send({ status: "cancelled" });
const getBatches = (token, itemId) =>
  request(app).get(`/api/items/${itemId}/batches`).set("Authorization", `Bearer ${token}`);
const getExpiring = (token, days) =>
  request(app).get(`/api/batches/expiring${days ? `?days=${days}` : ""}`).set("Authorization", `Bearer ${token}`);

const days = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

describe("IN on a batch-tracked item", () => {
  test("creates a batch with the received quantity and expiry", async () => {
    const item = await makeItem(company, { trackBatches: true });
    const expiry = days(90);

    const res = await post(admin.token, {
      type: "IN", itemId: item._id, qty: 10,
      batchNo: "LOT-A", mfgDate: days(-10), expiryDate: expiry,
    });
    expect(res.status).toBe(201);
    expect(res.body.transaction.batches).toHaveLength(1);
    expect(res.body.transaction.batches[0]).toMatchObject({ batchNo: "LOT-A", qty: 10 });

    const batches = await Batch.find({ itemId: item._id });
    expect(batches).toHaveLength(1);
    expect(batches[0].qtyRemaining).toBe(10);
    expect(batches[0].batchNo).toBe("LOT-A");
    expect(new Date(batches[0].expiryDate).toDateString()).toBe(expiry.toDateString());

    // Ledger row carries the batch ref
    const ledger = await Ledger.find({ itemId: item._id });
    expect(ledger).toHaveLength(1);
    expect(String(ledger[0].batchId)).toBe(String(batches[0]._id));
  });

  test("a second IN with the same batchNo increments the existing batch", async () => {
    const item = await makeItem(company, { trackBatches: true });
    await post(admin.token, { type: "IN", itemId: item._id, qty: 5, batchNo: "LOT-A", expiryDate: days(60) });
    await post(admin.token, { type: "IN", itemId: item._id, qty: 7, batchNo: "LOT-A" });

    const batches = await Batch.find({ itemId: item._id });
    expect(batches).toHaveLength(1);
    expect(batches[0].qtyRemaining).toBe(12);
    expect((await Item.findById(item._id)).qty).toBe(12);
  });
});

describe("OUT consumes batches FEFO", () => {
  test("an OUT larger than the first batch consumes across batches, earliest expiry first", async () => {
    const item = await makeItem(company, { trackBatches: true });
    // Received out of expiry order on purpose: LOT-LATE first, LOT-SOON second.
    await post(admin.token, { type: "IN", itemId: item._id, qty: 10, batchNo: "LOT-LATE", expiryDate: days(180) });
    await post(admin.token, { type: "IN", itemId: item._id, qty: 6,  batchNo: "LOT-SOON", expiryDate: days(20) });

    const res = await post(admin.token, { type: "OUT", itemId: item._id, qty: 9 });
    expect(res.status).toBe(201);

    // FEFO: all 6 of LOT-SOON first, then 3 from LOT-LATE
    const consumed = res.body.transaction.batches;
    expect(consumed).toHaveLength(2);
    expect(consumed[0]).toMatchObject({ batchNo: "LOT-SOON", qty: 6 });
    expect(consumed[1]).toMatchObject({ batchNo: "LOT-LATE", qty: 3 });

    const soon = await Batch.findOne({ itemId: item._id, batchNo: "LOT-SOON" });
    const late = await Batch.findOne({ itemId: item._id, batchNo: "LOT-LATE" });
    expect(soon.qtyRemaining).toBe(0);
    expect(late.qtyRemaining).toBe(7);
    expect((await Item.findById(item._id)).qty).toBe(7);
  });

  test("equal expiry dates fall back to receipt order", async () => {
    const item = await makeItem(company, { trackBatches: true });
    const sameDay = days(50);
    await post(admin.token, { type: "IN", itemId: item._id, qty: 4, batchNo: "FIRST",  expiryDate: sameDay });
    await post(admin.token, { type: "IN", itemId: item._id, qty: 4, batchNo: "SECOND", expiryDate: sameDay });

    const res = await post(admin.token, { type: "OUT", itemId: item._id, qty: 5 });
    expect(res.body.transaction.batches[0]).toMatchObject({ batchNo: "FIRST", qty: 4 });
    expect(res.body.transaction.batches[1]).toMatchObject({ batchNo: "SECOND", qty: 1 });
  });

  test("insufficient batch stock is rejected atomically with 400", async () => {
    const item = await makeItem(company, { trackBatches: true });
    // 5 batched + 5 un-batched legacy stock (new INs always land in a batch,
    // so the shortage is written directly): item-level stock allows an OUT of
    // 8, but batch stock (5) does not — the batch guard must reject it.
    await post(admin.token, { type: "IN", itemId: item._id, qty: 5, batchNo: "LOT-A", expiryDate: days(30) });
    await Item.updateOne({ _id: item._id }, { $inc: { qty: 5 } });

    const res = await post(admin.token, { type: "OUT", itemId: item._id, qty: 8 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/batch stock/i);

    // Nothing persisted from the failed request
    expect((await Item.findById(item._id)).qty).toBe(10);
    expect((await Batch.findOne({ itemId: item._id })).qtyRemaining).toBe(5);
    expect(await Transaction.countDocuments({ itemId: item._id, type: "OUT" })).toBe(0);
    expect(await Ledger.countDocuments({ itemId: item._id, type: "OUT" })).toBe(0);

    // An OUT exceeding even the item-level stock is also rejected with 400
    const res2 = await post(admin.token, { type: "OUT", itemId: item._id, qty: 20 });
    expect(res2.status).toBe(400);
    expect((await Item.findById(item._id)).qty).toBe(10);
  });
});

describe("soft cancel restores batches symmetrically", () => {
  test("cancelling an OUT returns each consumed slice to its batch", async () => {
    const item = await makeItem(company, { trackBatches: true });
    await post(admin.token, { type: "IN", itemId: item._id, qty: 6, batchNo: "A", expiryDate: days(10) });
    await post(admin.token, { type: "IN", itemId: item._id, qty: 6, batchNo: "B", expiryDate: days(99) });
    const out = await post(admin.token, { type: "OUT", itemId: item._id, qty: 8 });

    const res = await cancel(admin.token, out.body.transaction._id);
    expect(res.status).toBe(200);

    const a = await Batch.findOne({ itemId: item._id, batchNo: "A" });
    const b = await Batch.findOne({ itemId: item._id, batchNo: "B" });
    expect(a.qtyRemaining).toBe(6);
    expect(b.qtyRemaining).toBe(6);
    expect((await Item.findById(item._id)).qty).toBe(12);
  });

  test("cancelling an IN removes the received qty from its batch", async () => {
    const item = await makeItem(company, { trackBatches: true });
    const inTx = await post(admin.token, { type: "IN", itemId: item._id, qty: 10, batchNo: "A", expiryDate: days(40) });

    const res = await cancel(admin.token, inTx.body.transaction._id);
    expect(res.status).toBe(200);
    expect((await Batch.findOne({ itemId: item._id })).qtyRemaining).toBe(0);
    expect((await Item.findById(item._id)).qty).toBe(0);
  });

  test("cancelling an IN whose batch was already consumed is rejected", async () => {
    const item = await makeItem(company, { trackBatches: true });
    const inTx = await post(admin.token, { type: "IN", itemId: item._id, qty: 10, batchNo: "A", expiryDate: days(40) });
    await post(admin.token, { type: "OUT", itemId: item._id, qty: 8 }); // batch has 2 left

    const res = await cancel(admin.token, inTx.body.transaction._id);
    expect(res.status).toBe(400);
    expect((await Batch.findOne({ itemId: item._id })).qtyRemaining).toBe(2);
    expect((await Item.findById(item._id)).qty).toBe(2);
  });
});

describe("batch read endpoints", () => {
  test("GET /api/items/:id/batches lists batches FEFO with daysToExpiry", async () => {
    const item = await makeItem(company, { trackBatches: true });
    await post(admin.token, { type: "IN", itemId: item._id, qty: 3, batchNo: "LATE", expiryDate: days(100) });
    await post(admin.token, { type: "IN", itemId: item._id, qty: 4, batchNo: "SOON", expiryDate: days(5) });

    const res = await getBatches(admin.token, item._id);
    expect(res.status).toBe(200);
    expect(res.body.batches).toHaveLength(2);
    expect(res.body.batches[0].batchNo).toBe("SOON");
    expect(res.body.batches[0].daysToExpiry).toBeGreaterThanOrEqual(4);
    expect(res.body.batches[0].daysToExpiry).toBeLessThanOrEqual(5);
    expect(res.body.totalRemaining).toBe(7);
  });

  test("expiring report returns only batches inside the window, admin-only", async () => {
    const item = await makeItem(company, { trackBatches: true });
    await post(admin.token, { type: "IN", itemId: item._id, qty: 5, batchNo: "NEAR", expiryDate: days(10) });
    await post(admin.token, { type: "IN", itemId: item._id, qty: 5, batchNo: "FAR",  expiryDate: days(200) });

    const res = await getExpiring(admin.token, 30);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.batches[0].batchNo).toBe("NEAR");

    // Fully consumed batches drop out of the report
    await post(admin.token, { type: "OUT", itemId: item._id, qty: 5 }); // consumes NEAR (FEFO)
    const after = await getExpiring(admin.token, 30);
    expect(after.body.count).toBe(0);

    // Non-admins are rejected
    const viewer = await makeUser(company, { role: "viewer" });
    expect((await getExpiring(viewer.token, 30)).status).toBe(403);
  });

  test("tenant isolation: another company's batches are invisible", async () => {
    const other = await makeCompany();
    const otherAdmin = await makeUser(other, { role: "admin" });
    const foreign = await makeItem(other, { trackBatches: true });
    await post(otherAdmin.token, { type: "IN", itemId: foreign._id, qty: 5, batchNo: "X", expiryDate: days(5) });

    expect((await getBatches(admin.token, foreign._id)).status).toBe(404);
    expect((await getExpiring(admin.token, 30)).body.count).toBe(0);
  });
});

describe("expiring_batch alert", () => {
  test("raised during transaction writes when a near-expiry batch has stock", async () => {
    const item = await makeItem(company, { trackBatches: true, name: "Milk" });
    await post(admin.token, { type: "IN", itemId: item._id, qty: 5, batchNo: "SOON", expiryDate: days(7) });

    const alert = await Alert.findOne({ itemId: item._id, type: "expiring_batch" });
    expect(alert).not.toBeNull();
    expect(alert.status).toBe("open");
    expect(alert.message).toMatch(/SOON/);

    // Consuming the batch resolves the alert on the next write
    await post(admin.token, { type: "OUT", itemId: item._id, qty: 5 });
    const resolved = await Alert.findOne({ itemId: item._id, type: "expiring_batch" });
    expect(resolved.status).toBe("resolved");
  });

  test("not raised for far-future expiry", async () => {
    const item = await makeItem(company, { trackBatches: true });
    await post(admin.token, { type: "IN", itemId: item._id, qty: 5, batchNo: "FAR", expiryDate: days(300) });
    expect(await Alert.countDocuments({ itemId: item._id, type: "expiring_batch" })).toBe(0);
  });
});

describe("regression: non-tracked items behave exactly as before", () => {
  test("IN/OUT on a plain item creates no batches and keeps ledger shape", async () => {
    const item = await makeItem(company, { qty: 5 });

    const inRes = await post(admin.token, { type: "IN", itemId: item._id, qty: 10 });
    expect(inRes.status).toBe(201);
    expect(inRes.body.transaction.batches || []).toHaveLength(0);

    const outRes = await post(admin.token, { type: "OUT", itemId: item._id, qty: 12 });
    expect(outRes.status).toBe(201);
    expect((await Item.findById(item._id)).qty).toBe(3);

    expect(await Batch.countDocuments({})).toBe(0);
    const ledger = await Ledger.find({ itemId: item._id });
    expect(ledger).toHaveLength(2);
    expect(ledger.every((l) => l.batchId === null)).toBe(true);
  });

  test("IN on a tracked item without batch info lands in a batch named after the invoice", async () => {
    const item = await makeItem(company, { trackBatches: true });
    const res = await post(admin.token, { type: "IN", itemId: item._id, qty: 5 });
    expect(res.status).toBe(201);
    expect((await Item.findById(item._id)).qty).toBe(5);

    const batches = await Batch.find({ itemId: item._id });
    expect(batches).toHaveLength(1);
    expect(batches[0].qtyRemaining).toBe(5);
    expect(batches[0].batchNo).toBe(res.body.transaction.invoiceNo);
    expect(batches[0].expiryDate).toBeNull();
  });

  test("batchNo on a non-tracked item is ignored", async () => {
    const item = await makeItem(company, {});
    const res = await post(admin.token, { type: "IN", itemId: item._id, qty: 5, batchNo: "X" });
    expect(res.status).toBe(201);
    expect(await Batch.countDocuments({})).toBe(0);
  });
});
