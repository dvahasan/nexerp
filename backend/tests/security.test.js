const request = require("supertest");
const db = require("./helpers/db");
const { buildApp, makeCompany, makeUser, makeItem } = require("./helpers/app");
const { User, Company } = require("../models");

let app, company;

beforeAll(async () => {
  await db.connect();
  app = buildApp();
});
afterAll(async () => db.disconnect());

beforeEach(async () => {
  await db.clear();
  company = await makeCompany();
});

describe("auth responses never leak secrets", () => {
  test("login response has no passwordHash and no apiKeys for non-managers", async () => {
    await Company.findByIdAndUpdate(company._id, {
      apiKeys: [{ key: "nex_secret_key_under_test", name: "pos" }],
    });
    const { user } = await makeUser(company, { role: "viewer", username: "leaktest", password: "pw12345" });

    const res = await request(app).post("/api/auth/login").send({
      code: company.code, username: "leaktest", password: "pw12345",
    });

    expect(res.status).toBe(200);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.company.apiKeys).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("nex_secret_key_under_test");
  });

  test("a canManageCompany user still receives apiKeys (Settings page)", async () => {
    await Company.findByIdAndUpdate(company._id, {
      apiKeys: [{ key: "nex_visible_to_admin", name: "pos" }],
    });
    await makeUser(company, { role: "admin", username: "boss", password: "pw12345" });

    const res = await request(app).post("/api/auth/login").send({
      code: company.code, username: "boss", password: "pw12345",
    });

    expect(res.status).toBe(200);
    expect(res.body.company.apiKeys?.[0]?.key).toBe("nex_visible_to_admin");
    expect(res.body.user.passwordHash).toBeUndefined();
  });
});

describe("mass-assignment protection", () => {
  test("PUT /api/users/:id cannot set isEnterprise / ownedCompanies / companyId", async () => {
    const admin = await makeUser(company, { role: "admin" });
    const { user: victim } = await makeUser(company, { role: "manager" });
    const otherCompany = await makeCompany();

    const res = await request(app)
      .put(`/api/users/${victim._id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Renamed",
        isEnterprise: true,
        ownedCompanies: [otherCompany._id],
        companyId: otherCompany._id,
      });

    expect(res.status).toBe(200);
    const fresh = await User.findById(victim._id);
    expect(fresh.name).toBe("Renamed");                       // whitelisted field applied
    expect(fresh.isEnterprise).toBe(false);                   // blocked
    expect(fresh.ownedCompanies).toHaveLength(0);             // blocked
    expect(fresh.companyId.toString()).toBe(company._id.toString()); // blocked
  });

  test("PUT /api/company cannot change code or active, and normalizes string apiKeys", async () => {
    const admin = await makeUser(company, { role: "admin" });

    const res = await request(app)
      .put("/api/company")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "New Name", code: "HAX-99", active: false, apiKeys: ["nex_plainstring"] });

    expect(res.status).toBe(200);
    const fresh = await Company.findById(company._id);
    expect(fresh.name).toBe("New Name");
    expect(fresh.code).toBe(company.code); // unchanged
    expect(fresh.active).toBe(true);       // unchanged
    expect(fresh.apiKeys).toHaveLength(1);
    expect(fresh.apiKeys[0].key).toBe("nex_plainstring"); // normalized to subdocument
  });

  test("POST /api/users can never mint an owner", async () => {
    const admin = await makeUser(company, { role: "admin" });
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Sneaky", username: "sneaky", password: "pw12345", role: "owner" });

    expect(res.status).toBe(201);
    expect(res.body.role).not.toBe("owner");
  });
});
