// Cross-module behavior: purchase orders × batch tracking, and item edits /
// deletes against the ledger.
const request = require("supertest");
const db = require("./helpers/db");
const { buildApp, makeCompany, makeUser, makeItem } = require("./helpers/app");
const { Item, Batch, Ledger, Source, Transaction } = require("../models");

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

const auth = (r) => r.set("Authorization", `Bearer ${admin.token}`);
const days = (n) => new Date(Date.now() + n * 86400000).toISOString();
const ledgerSum = async (itemId) =>
  (await Ledger.find({ itemId })).reduce((s, l) => s + l.qtyChange, 0);
const batchSum = async (itemId) =>
  (await Batch.find({ itemId })).reduce((s, b) => s + b.qtyRemaining, 0);

async function confirmedPo(item, orderedQty) {
  const supplier = await Source.create({ companyId: company._id, name: "Supplier" });
  const created = await auth(request(app).post("/api/purchase-orders")).send({
    supplier: supplier._id, lines: [{ itemId: item._id, orderedQty, unitCost: 5 }],
  });
  expect(created.status).toBe(201);
  const po = created.body.po || created.body;
  expect((await auth(request(app).post(`/api/purchase-orders/${po._id}/confirm`))).status).toBe(200);
  return po;
}

describe("purchase-order receiving × batch tracking", () => {
  test("receiving a batch-tracked item records the lot and expiry", async () => {
    const item = await makeItem(company, { name: "Milk", qty: 0, trackBatches: true });
    const po = await confirmedPo(item, 10);

    const res = await auth(request(app).post(`/api/purchase-orders/${po._id}/receive`)).send({
      lines: [{ lineId: po.lines[0]._id, qty: 10, batchNo: "LOT-1", expiryDate: days(30) }],
    });
    expect(res.status).toBe(201);

    const batch = await Batch.findOne({ itemId: item._id, batchNo: "LOT-1" });
    expect(batch.qtyRemaining).toBe(10);
    expect(batch.expiryDate).not.toBeNull();
    expect(res.body.transactions[0].batches[0]).toMatchObject({ batchNo: "LOT-1", qty: 10 });
  });

  test("receiving without a batchNo still lands in a batch (named after the GRN)", async () => {
    const item = await makeItem(company, { name: "Milk", qty: 0, trackBatches: true });
    const po = await confirmedPo(item, 6);

    const res = await auth(request(app).post(`/api/purchase-orders/${po._id}/receive`)).send({
      lines: [{ lineId: po.lines[0]._id, qty: 6 }],
    });
    expect(res.status).toBe(201);
    expect(await batchSum(item._id)).toBe(6);
    const [batch] = await Batch.find({ itemId: item._id });
    expect(batch.batchNo).toMatch(/^GRN-/);

    // ...so an OUT of the full received qty succeeds (it used to fail FEFO)
    const out = await auth(request(app).post("/api/transactions")).send({ type: "OUT", itemId: item._id, qty: 6 });
    expect(out.status).toBe(201);
  });

  test("Stock In without a batchNo on a tracked item keeps batch totals equal to qty", async () => {
    const item = await makeItem(company, { name: "Milk", qty: 0, trackBatches: true });
    await auth(request(app).post("/api/transactions")).send({ type: "IN", itemId: item._id, qty: 4 });
    expect(await batchSum(item._id)).toBe(4);
    expect((await Item.findById(item._id)).qty).toBe(4);
  });
});

describe("enabling batch tracking on an item with stock", () => {
  test("existing stock moves into an OPENING batch so OUTs keep working", async () => {
    const item = await makeItem(company, { name: "Bolts", qty: 0 });
    await auth(request(app).post("/api/transactions")).send({ type: "IN", itemId: item._id, qty: 12 });

    const res = await auth(request(app).put(`/api/items/${item._id}`)).send({ name: "Bolts", trackBatches: true, qty: 12 });
    expect(res.status).toBe(200);

    const opening = await Batch.findOne({ itemId: item._id, batchNo: "OPENING" });
    expect(opening.qtyRemaining).toBe(12);

    const out = await auth(request(app).post("/api/transactions")).send({ type: "OUT", itemId: item._id, qty: 12 });
    expect(out.status).toBe(201);
  });
});

describe("item edits and deletes keep the ledger honest", () => {
  test("changing qty in an item edit writes an ADJUST ledger row", async () => {
    const item = await makeItem(company, { name: "Cable", qty: 0 });
    await auth(request(app).post("/api/transactions")).send({ type: "IN", itemId: item._id, qty: 10 });

    const res = await auth(request(app).put(`/api/items/${item._id}`)).send({ name: "Cable", qty: 7 });
    expect(res.status).toBe(200);
    expect(res.body.qty).toBe(7);

    const adj = await Ledger.findOne({ itemId: item._id, type: "ADJUST" });
    expect(adj).toMatchObject({ qtyChange: -3, qtyBefore: 10, qtyAfter: 7 });
    expect(await ledgerSum(item._id)).toBe(7);
  });

  test("an edit that doesn't change qty writes no ledger row", async () => {
    const item = await makeItem(company, { name: "Cable", qty: 0 });
    await auth(request(app).post("/api/transactions")).send({ type: "IN", itemId: item._id, qty: 10 });

    await auth(request(app).put(`/api/items/${item._id}`)).send({ name: "Cable v2", qty: 10 });
    expect(await Ledger.countDocuments({ itemId: item._id })).toBe(1);
  });

  test("an edit cannot move an item to another company or reset avgCost", async () => {
    const other = await makeCompany();
    const item = await makeItem(company, { name: "Cable", qty: 0, avgCost: 4 });

    await auth(request(app).put(`/api/items/${item._id}`)).send({ name: "Cable", companyId: other._id, avgCost: 0 });
    const fresh = await Item.findById(item._id);
    expect(fresh.companyId.toString()).toBe(company._id.toString());
    expect(fresh.avgCost).toBe(4);
  });

  test("qty of a batch-tracked item cannot be edited directly", async () => {
    const item = await makeItem(company, { name: "Milk", qty: 0, trackBatches: true });
    await auth(request(app).post("/api/transactions")).send({ type: "IN", itemId: item._id, qty: 5, batchNo: "A" });

    const res = await auth(request(app).put(`/api/items/${item._id}`)).send({ name: "Milk", qty: 9 });
    expect(res.status).toBe(400);
    expect((await Item.findById(item._id)).qty).toBe(5);
  });

  test("deleting an item is a soft delete; history survives and new movements are refused", async () => {
    const item = await makeItem(company, { name: "Old part", qty: 0 });
    await auth(request(app).post("/api/transactions")).send({ type: "IN", itemId: item._id, qty: 3 });

    const del = await auth(request(app).delete(`/api/items/${item._id}`));
    expect(del.status).toBe(200);

    const fresh = await Item.findById(item._id);
    expect(fresh).not.toBeNull();
    expect(fresh.deletedAt).not.toBeNull();
    expect(await Transaction.countDocuments({ itemId: item._id })).toBe(1);

    const tx = await auth(request(app).post("/api/transactions")).send({ type: "OUT", itemId: item._id, qty: 1 });
    expect(tx.status).toBe(404);

    const list = await auth(request(app).get("/api/items"));
    const ids = (list.body.items || list.body).map((i) => i._id);
    expect(ids).not.toContain(item._id.toString());
  });
});
