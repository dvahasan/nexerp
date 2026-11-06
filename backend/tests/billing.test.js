const request = require("supertest");
const express = require("express");
const db = require("./helpers/db");
const { makeCompany, makeUser } = require("./helpers/app");
const { Company } = require("../models");

let app, company, admin;

beforeAll(async () => {
  await db.connect();
  app = express();
  app.use(express.json());
  app.use("/api/billing", require("../routes/billing").router);
  app.use("/api/users", require("../routes/users"));
  app.use("/api/ai", require("../routes/ai"));
});
afterAll(async () => db.disconnect());

beforeEach(async () => {
  await db.clear();
  delete process.env.STRIPE_SECRET_KEY;
  company = await makeCompany();
  admin = await makeUser(company, { role: "admin" });
});

const addUser = (token, username) =>
  request(app).post("/api/users").set("Authorization", `Bearer ${token}`)
    .send({ name: username, username, password: "pw12345" });

describe("billing disabled (no STRIPE_SECRET_KEY)", () => {
  test("GET /api/billing reports billingEnabled:false with plan info", async () => {
    const res = await request(app).get("/api/billing").set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.billingEnabled).toBe(false);
    expect(res.body.tier).toBe("free");
    expect(res.body.plans.professional.ai).toBe(true);
  });

  test("checkout returns 503 when billing is not configured", async () => {
    const res = await request(app)
      .post("/api/billing/checkout")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ tier: "professional" });
    expect(res.status).toBe(503);
  });

  test("staff limit is NOT enforced when billing is disabled", async () => {
    for (let i = 0; i < 4; i++) {
      expect((await addUser(admin.token, `u${i}`)).status).toBe(201);
    }
  });
});

describe("plan enforcement (billing configured)", () => {
  beforeEach(() => { process.env.STRIPE_SECRET_KEY = "sk_test_dummy"; });
  afterEach(() => { delete process.env.STRIPE_SECRET_KEY; });

  test("free plan blocks the 4th staff account with 402", async () => {
    // admin is staff #1; add two more to reach the free limit of 3
    expect((await addUser(admin.token, "u1")).status).toBe(201);
    expect((await addUser(admin.token, "u2")).status).toBe(201);

    const blocked = await addUser(admin.token, "u3");
    expect(blocked.status).toBe(402);
    expect(blocked.body.upgradeRequired).toBe(true);
  });

  test("enterprise plan has no staff limit", async () => {
    await Company.findByIdAndUpdate(company._id, { $set: { "plan.tier": "enterprise", "plan.status": "active" } });
    for (let i = 0; i < 5; i++) {
      expect((await addUser(admin.token, `e${i}`)).status).toBe(201);
    }
  });

  test("AI chat is gated to Professional+ with 402", async () => {
    const blocked = await request(app)
      .post("/api/ai/chat")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ prompt: "how much stock do I have?" });
    expect(blocked.status).toBe(402);

    await Company.findByIdAndUpdate(company._id, { $set: { "plan.tier": "professional", "plan.status": "active" } });
    const allowed = await request(app)
      .post("/api/ai/chat")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ prompt: "how much stock do I have?" });
    expect(allowed.status).toBe(200); // falls back to heuristic mode without GEMINI_API_KEY
  });
});

describe("webhook plan updates", () => {
  test("checkout.session.completed upgrades the company", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy"; // enable billing, no webhook secret → unsigned dev mode
    const whApp = express();
    whApp.post("/api/billing/webhook", express.raw({ type: "application/json" }), require("../routes/billing").webhookHandler);

    const event = {
      type: "checkout.session.completed",
      data: { object: {
        metadata: { companyId: company._id.toString(), tier: "professional" },
        customer: "cus_123", subscription: "sub_123",
      } },
    };
    const res = await request(whApp)
      .post("/api/billing/webhook")
      .set("Content-Type", "application/json")
      .send(JSON.stringify(event));

    expect(res.status).toBe(200);
    const fresh = await Company.findById(company._id);
    expect(fresh.plan.tier).toBe("professional");
    expect(fresh.plan.status).toBe("active");
    expect(fresh.plan.stripeCustomerId).toBe("cus_123");
    delete process.env.STRIPE_SECRET_KEY;
  });
});
