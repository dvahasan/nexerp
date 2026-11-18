const express = require("express");
const { Company, User } = require("../models");
const { protect, need } = require("../middleware/auth");
const { friendly, statusFor, httpError } = require("../errors");
const { PLANS, planFor, billingEnabled } = require("../config/plans");

const router = express.Router();

const stripe = () => require("stripe")(process.env.STRIPE_SECRET_KEY);

const requireBilling = (req, res, next) =>
  billingEnabled()
    ? next()
    : res.status(503).json({ message: "Billing is not configured on this server" });

// ── GET /api/billing ──────────────────────────────────────────────────────────
// Current plan, limits and usage for the caller's company.
router.get("/", protect, async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const plan = planFor(company);
    const staffCount = await User.countDocuments({ companyId: company._id });

    res.json({
      billingEnabled: billingEnabled(),
      tier: company.plan?.tier || "free",
      status: company.plan?.status || "none",
      currentPeriodEnd: company.plan?.currentPeriodEnd || null,
      limits: { staff: plan.staff, ai: plan.ai },
      usage: { staff: staffCount },
      plans: Object.fromEntries(
        Object.entries(PLANS).map(([k, p]) => [k, { label: p.label, staff: p.staff, ai: p.ai, priceUsd: p.priceUsd }])
      ),
    });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/billing/checkout { tier } ───────────────────────────────────────
// Owner-only: creates a Stripe Checkout session for a subscription upgrade.
router.post("/checkout", protect, need("canManageCompany"), requireBilling, async (req, res) => {
  try {
    const { tier } = req.body;
    const plan = PLANS[tier];
    if (!plan || !plan.priceEnv) throw httpError(400, "Unknown plan tier");
    const priceId = process.env[plan.priceEnv];
    if (!priceId) throw httpError(503, `Price for ${tier} is not configured (${plan.priceEnv})`);

    const company = await Company.findById(req.user.companyId);
    const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim();

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${clientUrl}/settings?billing=success`,
      cancel_url: `${clientUrl}/settings?billing=cancelled`,
      customer: company.plan?.stripeCustomerId || undefined,
      customer_email: company.plan?.stripeCustomerId ? undefined : (req.user.email || undefined),
      client_reference_id: company._id.toString(),
      metadata: { companyId: company._id.toString(), tier },
      subscription_data: { metadata: { companyId: company._id.toString(), tier } },
    });

    res.json({ url: session.url });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── POST /api/billing/portal ──────────────────────────────────────────────────
// Owner-only: Stripe customer portal for managing/cancelling the subscription.
router.post("/portal", protect, need("canManageCompany"), requireBilling, async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyId);
    if (!company?.plan?.stripeCustomerId)
      throw httpError(400, "No active subscription for this company");
    const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim();

    const session = await stripe().billingPortal.sessions.create({
      customer: company.plan.stripeCustomerId,
      return_url: `${clientUrl}/settings`,
    });
    res.json({ url: session.url });
  } catch (e) { res.status(statusFor(e)).json({ message: friendly(e) }); }
});

// ── Webhook (mounted in server.js with express.raw BEFORE express.json) ───────
// stripe listen --forward-to localhost:5000/api/billing/webhook
async function webhookHandler(req, res) {
  if (!billingEnabled()) return res.status(503).end();

  let event;
  try {
    const sig = req.headers["stripe-signature"];
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe().webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // Unsigned mode is for local development only
      event = JSON.parse(req.body.toString());
      console.warn("⚠️  Stripe webhook accepted WITHOUT signature verification (set STRIPE_WEBHOOK_SECRET)");
    }
  } catch (err) {
    return res.status(400).json({ message: `Webhook signature verification failed` });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const companyId = s.metadata?.companyId || s.client_reference_id;
        const tier = s.metadata?.tier;
        if (companyId && PLANS[tier]) {
          await Company.findByIdAndUpdate(companyId, {
            $set: {
              "plan.tier": tier,
              "plan.status": "active",
              "plan.stripeCustomerId": s.customer || "",
              "plan.stripeSubscriptionId": s.subscription || "",
            },
          });
          console.log(`💳 Company ${companyId} upgraded to ${tier}`);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const companyId = sub.metadata?.companyId;
        if (companyId) {
          const update = {
            "plan.status": sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "cancelled",
            "plan.currentPeriodEnd": sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          };
          if (sub.metadata?.tier && PLANS[sub.metadata.tier]) update["plan.tier"] = sub.metadata.tier;
          await Company.findByIdAndUpdate(companyId, { $set: update });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const companyId = sub.metadata?.companyId;
        if (companyId) {
          await Company.findByIdAndUpdate(companyId, {
            $set: { "plan.tier": "free", "plan.status": "cancelled", "plan.stripeSubscriptionId": "" },
          });
          console.log(`💳 Company ${companyId} downgraded to free (subscription deleted)`);
        }
        break;
      }
      default:
        break; // ignore everything else
    }
    res.json({ received: true });
  } catch (e) {
    console.error("Stripe webhook error:", e.message);
    res.status(500).json({ message: "Webhook processing failed" });
  }
}

module.exports = { router, webhookHandler };
