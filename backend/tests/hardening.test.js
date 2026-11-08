const request = require("supertest");
const express = require("express");
const db = require("./helpers/db");
const { makeCompany, makeUser, makeItem } = require("./helpers/app");
const { Item, Ledger } = require("../models");
const { isPrivateAddress, fetchPublicImage } = require("../utils/safeFetch");
const { redactBody } = require("../utils/redact");

describe("SSRF guard", () => {
  test.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.5", "192.168.1.1", "169.254.169.254",
    "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1",
  ])("%s is private", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  test.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])("%s is public", (ip) =>
    expect(isPrivateAddress(ip)).toBe(false));

  test.each([
    "http://127.0.0.1/admin",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]:5000/",
    "http://localhost:27017/",
    "file:///etc/passwd",
    "ftp://example.com/x.png",
    "not a url",
  ])("refuses %s", async (url) => {
    await expect(fetchPublicImage(url)).rejects.toMatchObject({ status: 400 });
  });
});

describe("audit-log redaction", () => {
  test("strips secrets and personal data at any depth, keeps the rest", () => {
    const out = redactBody({
      name: "Bolt", password: "x", passwordHash: "y", email: "a@b.c",
      company: { phone: "123", apiKeys: [{ key: "k" }], address: "street" },
      items: [{ itemId: "1", qty: 2 }],
    });
    expect(out).toEqual({
      name: "Bolt", password: "[redacted]", passwordHash: "[redacted]", email: "[redacted]",
      company: { phone: "[redacted]", apiKeys: "[redacted]", address: "[redacted]" },
      items: [{ itemId: "1", qty: 2 }],
    });
  });
});

describe("CSV import", () => {
  let app, company, admin;

  beforeAll(async () => {
    await db.connect();
    app = express();
    app.use(express.json());
    app.use("/api/import", require("../routes/import"));
  });
  afterAll(async () => db.disconnect());
  beforeEach(async () => {
    await db.clear();
    company = await makeCompany();
    admin = await makeUser(company, { role: "admin" });
  });

  const upload = (token, csv) =>
    request(app).post("/api/import/csv")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from(csv), "items.csv");

  test("viewers cannot import (403)", async () => {
    const viewer = await makeUser(company, { role: "viewer" });
    expect((await upload(viewer.token, "name,sku,qty\nA,A-1,5\n")).status).toBe(403);
  });

  test("imported quantities are recorded as opening-stock ledger rows", async () => {
    const res = await upload(admin.token, "name,sku,qty\nWidget,W-1,7\nGadget,G-1,0\n");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);

    const widget = await Item.findOne({ companyId: company._id, sku: "W-1" });
    expect(widget.qty).toBe(7);
    const rows = await Ledger.find({ itemId: widget._id });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ type: "ADJUST", qtyChange: 7 });
  });

  test("re-importing the same file skips existing SKUs", async () => {
    await makeItem(company, { name: "Widget", sku: "W-1", qty: 3 });
    const res = await upload(admin.token, "name,sku,qty\nWidget,W-1,7\nNew,N-1,1\n");
    expect(res.body.count).toBe(1);
    expect(res.body.skippedDuplicates).toBe(1);
    expect(await Item.countDocuments({ companyId: company._id, sku: "W-1" })).toBe(1);
  });
});
