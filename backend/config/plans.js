/**
 * Subscription tiers — the single source of truth for plan limits.
 * Mirrors the landing-page pricing. `staff: null` means unlimited.
 *
 * Enforcement is active only when billing is configured (STRIPE_SECRET_KEY
 * set): a self-hosted or dev install without Stripe keeps today's unlimited
 * behavior, since there would be no way to upgrade.
 */
const PLANS = {
  free: {
    label: "Free",
    staff: 3,
    ai: false,
    priceUsd: 0,
  },
  starter: {
    label: "Starter",
    staff: 3,
    ai: false,
    priceUsd: 19,
    priceEnv: "STRIPE_PRICE_STARTER",
  },
  professional: {
    label: "Professional",
    staff: 10,
    ai: true,
    priceUsd: 49,
    priceEnv: "STRIPE_PRICE_PROFESSIONAL",
  },
  enterprise: {
    label: "Enterprise",
    staff: null,
    ai: true,
    priceUsd: 149,
    priceEnv: "STRIPE_PRICE_ENTERPRISE",
  },
};

const billingEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

/** Resolve the effective plan for a company document. */
const planFor = (company) => PLANS[company?.plan?.tier] || PLANS.free;

module.exports = { PLANS, planFor, billingEnabled };
