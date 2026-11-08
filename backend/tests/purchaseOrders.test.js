const request = require("supertest");
const db = require("./helpers/db");
const { buildApp, makeCompany, makeUser, makeItem } = require("./helpers/app");
const { Item, Transaction, Ledger, Source, PurchaseOrder } = require("../models");

let app, company, admin, supplier;

beforeAll(async () => {
  await db.connect();
  app = buildApp();
});
afterAll(async () => db.disconnect());

beforeEach(async () => {
  await db.clear();
  company = await makeCompany();
  admin = await makeUser(company, { role: "admin" });
  supplier = await Source.create({ companyId: company._id, name: "Acme Supplies" });
});

const auth = (r, token) => r.set("Authorization", `Bearer ${token}`);
const createPo = (token, body) => auth(request(app).post("/api/purchase-orders"), token).send(body);
const confirmPo = (token, id) => auth(request(app).post(`/api/purchase-orders/${id}/confirm`), token).send();
const cancelPo = (token, id) => auth(request(app).post(`/api/purchase-orders/${id}/cancel`), token).send();
const receivePo = (token, id, body) => auth(request(app).post(`/api/purchase-orders/${id}/receive`), token).send(body);

// Create + confirm a PO for one item, return { po, item }
async function confirmedPo(overrides = {}) {
  const item = await makeItem(company, { qty: overrides.startQty ?? 0, avgCost: overrides.startAvgCost ?? 0 });
  const created = await createPo(admin.token, {
    supplier: supplier._id,
    lines: [{ itemId: item._id, orderedQty: overrides.orderedQty ?? 10, unitCost: overrides.unitCost ?? 5 }],
  });
  expect(created.status).toBe(201);
  const confirmed = await confirmPo(admin.token, created.body._id);
  expect(confirmed.status).toBe(200);
  return { po: confirmed.body, item };
}

describe("PO lifecycle — create / confirm / update", () => {
  test("create returns a draft with an auto-generated poNo", async () => {
    const item = await makeItem(company);
    const res = await createPo(admin.token, {
      supplier: supplier._id,
      lines: [{ itemId: item._id, orderedQty: 4, unitCost: 2.5 }],
      currency: "USD",
      notes: "First order",
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("draft");
    expect(res.body.poNo).toMatch(/^PO-/);
    expect(res.body.lines).toHaveLength(1);
    expect(res.body.lines[0]).toMatchObject({ orderedQty: 4, receivedQty: 0, unitCost: 2.5 });
  });

  test("create without lines or with a non-positive qty is rejected with 400", async () => {
    const item = await makeItem(company);
    expect((await createPo(admin.token, { supplier: supplier._id, lines: [] })).status).toBe(400);
    expect((await createPo(admin.token, {
      supplier: supplier._id, lines: [{ itemId: item._id, orderedQty: 0 }],
    })).status).toBe(400);
  });

  test("confirm moves draft → confirmed; confirming twice is rejected", async () => {
    const { po } = await confirmedPo();
    expect(po.status).toBe("confirmed");
    const again = await confirmPo(admin.token, po._id);
    expect(again.status).toBe(400);
  });

  test("draft can be updated; confirmed PO cannot (400)", async () => {
    const item = await makeItem(company);
    const created = await createPo(admin.token, {
      supplier: supplier._id,
      lines: [{ itemId: item._id, orderedQty: 3, unitCost: 1 }],
    });
    const upd = await auth(request(app).put(`/api/purchase-orders/${created.body._id}`), admin.token)
      .send({ notes: "updated", lines: [{ itemId: item._id, orderedQty: 7, unitCost: 2 }] });
    expect(upd.status).toBe(200);
    expect(upd.body.notes).toBe("updated");
    expect(upd.body.lines[0].orderedQty).toBe(7);

    await confirmPo(admin.token, created.body._id);
    const afterConfirm = await auth(request(app).put(`/api/purchase-orders/${created.body._id}`), admin.token)
      .send({ notes: "nope" });
    expect(afterConfirm.status).toBe(400);
  });

  test("list filters by status", async () => {
    await confirmedPo();
    const item = await makeItem(company);
    await createPo(admin.token, { supplier: supplier._id, lines: [{ itemId: item._id, orderedQty: 1 }] });

    const drafts = await auth(request(app).get("/api/purchase-orders?status=draft"), admin.token);
    expect(drafts.status).toBe(200);
    expect(drafts.body.total).toBe(1);
    expect(drafts.body.pos[0].status).toBe("draft");

    const all = await auth(request(app).get("/api/purchase-orders"), admin.token);
    expect(all.body.total).toBe(2);
  });
});

describe("POST /:id/receive — goods receipt", () => {
  test("partial then full receive updates status, stock, avgCost, transactions and ledger", async () => {
    const { po, item } = await confirmedPo({ orderedQty: 10, unitCost: 5 });
    const lineId = po.lines[0]._id;

    // Partial: 4 of 10
    const partial = await receivePo(admin.token, po._id, { lines: [{ lineId, qty: 4 }] });
    expect(partial.status).toBe(201);
    expect(partial.body.po.status).toBe("partially_received");
    expect(partial.body.po.lines[0].receivedQty).toBe(4);

    let fresh = await Item.findById(item._id);
    expect(fresh.qty).toBe(4);
    expect(fresh.avgCost).toBe(5);

    const tx = await Transaction.findOne({ itemId: item._id });
    expect(tx.type).toBe("IN");
    expect(tx.invoiceNo).toMatch(/^GRN-/);
    expect(tx.qty).toBe(4);
    expect(tx.unitCost).toBe(5);
    expect(tx.sourceId.toString()).toBe(supplier._id.toString());

    // Full: remaining 6
    const full = await receivePo(admin.token, po._id, { lines: [{ lineId, qty: 6 }] });
    expect(full.status).toBe(201);
    expect(full.body.po.status).toBe("received");
    expect(full.body.po.lines[0].receivedQty).toBe(10);

    fresh = await Item.findById(item._id);
    expect(fresh.qty).toBe(10);
    expect(await Transaction.countDocuments({ itemId: item._id })).toBe(2);

    // Ledger-sum invariant: Σ qtyChange equals item.qty (started at 0)
    const ledger = await Ledger.find({ itemId: item._id });
    expect(ledger).toHaveLength(2);
    const sum = ledger.reduce((acc, l) => acc + l.qtyChange, 0);
    expect(sum).toBe(fresh.qty);
    expect(ledger.every(l => l.type === "IN")).toBe(true);
  });

  test("moving-average cost blends existing stock with the PO line cost", async () => {
    // 10 on hand @ 2, receive 10 @ 6 → avg 4
    const { po } = await confirmedPo({ startQty: 10, startAvgCost: 2, orderedQty: 10, unitCost: 6 });
    const itemId = po.lines[0].itemId._id || po.lines[0].itemId;

    const res = await receivePo(admin.token, po._id, { lines: [{ lineId: po.lines[0]._id, qty: 10 }] });
    expect(res.status).toBe(201);

    const fresh = await Item.findById(itemId);
    expect(fresh.qty).toBe(20);
    expect(fresh.avgCost).toBe(4);
  });

  test("over-receive is rejected with 400 and nothing persists", async () => {
    const { po, item } = await confirmedPo({ orderedQty: 10 });
    const res = await receivePo(admin.token, po._id, { lines: [{ lineId: po.lines[0]._id, qty: 11 }] });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/only 10 remaining/i);

    expect((await Item.findById(item._id)).qty).toBe(0);
    expect(await Transaction.countDocuments({ itemId: item._id })).toBe(0);
    expect(await Ledger.countDocuments({ itemId: item._id })).toBe(0);
    const freshPo = await PurchaseOrder.findById(po._id);
    expect(freshPo.status).toBe("confirmed");
    expect(freshPo.lines[0].receivedQty).toBe(0);
  });

  test("a multi-line receive that over-receives one line rolls back entirely", async () => {
    const itemA = await makeItem(company, { name: "A", qty: 0 });
    const itemB = await makeItem(company, { name: "B", qty: 0 });
    const created = await createPo(admin.token, {
      supplier: supplier._id,
      lines: [
        { itemId: itemA._id, orderedQty: 5, unitCost: 1 },
        { itemId: itemB._id, orderedQty: 5, unitCost: 1 },
      ],
    });
    await confirmPo(admin.token, created.body._id);
    const [lineA, lineB] = created.body.lines;

    const res = await receivePo(admin.token, created.body._id, {
      lines: [{ lineId: lineA._id, qty: 5 }, { lineId: lineB._id, qty: 99 }],
    });
    expect(res.status).toBe(400);
    expect((await Item.findById(itemA._id)).qty).toBe(0); // rolled back
    expect(await Transaction.countDocuments({})).toBe(0);
  });

  test("receiving against a draft PO is rejected with 400", async () => {
    const item = await makeItem(company);
    const created = await createPo(admin.token, {
      supplier: supplier._id, lines: [{ itemId: item._id, orderedQty: 5 }],
    });
    const res = await receivePo(admin.token, created.body._id, {
      lines: [{ lineId: created.body.lines[0]._id, qty: 1 }],
    });
    expect(res.status).toBe(400);
  });

  test("receive with warehouseId tracks the stock location", async () => {
    const { ItemStockLocation, Warehouse } = require("../models");
    const wh = await Warehouse.create({ companyId: company._id, code: "WH-01", name: "Main" });
    const { po, item } = await confirmedPo({ orderedQty: 8 });

    const res = await receivePo(admin.token, po._id, {
      lines: [{ lineId: po.lines[0]._id, qty: 8, warehouseId: wh._id }],
    });
    expect(res.status).toBe(201);

    const loc = await ItemStockLocation.findOne({ itemId: item._id, warehouseId: wh._id });
    expect(loc.qty).toBe(8);
  });
});

describe("POST /:id/cancel", () => {
  test("a confirmed-but-unreceived PO can be cancelled", async () => {
    const { po } = await confirmedPo();
    const res = await cancelPo(admin.token, po._id);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });

  test("a partially received PO cannot be cancelled", async () => {
    const { po } = await confirmedPo({ orderedQty: 10 });
    await receivePo(admin.token, po._id, { lines: [{ lineId: po.lines[0]._id, qty: 3 }] });
    const res = await cancelPo(admin.token, po._id);
    expect(res.status).toBe(400);
    expect((await PurchaseOrder.findById(po._id)).status).toBe("partially_received");
  });

  test("receiving against a cancelled PO is rejected", async () => {
    const { po } = await confirmedPo();
    await cancelPo(admin.token, po._id);
    const res = await receivePo(admin.token, po._id, {
      lines: [{ lineId: po.lines[0]._id, qty: 1 }],
    });
    expect(res.status).toBe(400);
  });
});

describe("permissions and tenant isolation", () => {
  test("warehouse role (no canManagePurchases) gets 403 on every PO route", async () => {
    const wh = await makeUser(company, { role: "warehouse" });
    const item = await makeItem(company);
    expect((await auth(request(app).get("/api/purchase-orders"), wh.token)).status).toBe(403);
    expect((await createPo(wh.token, {
      supplier: supplier._id, lines: [{ itemId: item._id, orderedQty: 1 }],
    })).status).toBe(403);
  });

  test("receiving requires canTxIn in addition to canManagePurchases", async () => {
    const { po } = await confirmedPo();
    // Manager has canManagePurchases by role; override canTxIn off
    const noTxIn = await makeUser(company, { role: "manager", permissions: { canTxIn: false } });
    const res = await receivePo(noTxIn.token, po._id, {
      lines: [{ lineId: po.lines[0]._id, qty: 1 }],
    });
    expect(res.status).toBe(403);
    expect((await PurchaseOrder.findById(po._id)).lines[0].receivedQty).toBe(0);
  });

  test("a user cannot see or receive another company's PO (404)", async () => {
    const { po } = await confirmedPo();
    const otherCompany = await makeCompany();
    const outsider = await makeUser(otherCompany, { role: "admin" });

    expect((await auth(request(app).get(`/api/purchase-orders/${po._id}`), outsider.token)).status).toBe(404);
    const res = await receivePo(outsider.token, po._id, {
      lines: [{ lineId: po.lines[0]._id, qty: 1 }],
    });
    expect(res.status).toBe(404);
    expect((await PurchaseOrder.findById(po._id)).lines[0].receivedQty).toBe(0);
  });

  test("creating a PO with another company's supplier or item is rejected (404)", async () => {
    const otherCompany = await makeCompany();
    const foreignSupplier = await Source.create({ companyId: otherCompany._id, name: "Foreign" });
    const foreignItem = await makeItem(otherCompany);
    const myItem = await makeItem(company);

    expect((await createPo(admin.token, {
      supplier: foreignSupplier._id, lines: [{ itemId: myItem._id, orderedQty: 1 }],
    })).status).toBe(404);

    expect((await createPo(admin.token, {
      supplier: supplier._id, lines: [{ itemId: foreignItem._id, orderedQty: 1 }],
    })).status).toBe(404);
  });
});
