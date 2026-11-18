# Security hardening, test suite, billing, procurement, lot tracking

Implements the project-council review (council-reports/run-20261021-0003) on top of the last deployed state.

## What changes

**Security (Critical/High findings)**
- No more hardcoded secret fallbacks: the server refuses to start without `JWT_SECRET`; `/api/dev` only mounts with a strong `DEV_MASTER_KEY`
- Demo data (`NEX-01` / `admin` / `admin`) is only seeded when `SEED_DEMO=true`
- Cross-tenant takeover closed: user/company/item updates accept only whitelisted fields
- Login/register rate limits; password hashes and API keys no longer returned to clients; CORS pinned to `CLIENT_URL`
- SSRF guard on photo-from-url; validated AI CSV mapping; redacted, 90-day-retention audit log

**Stock integrity**
- Every quantity change goes through the ledger (transactions, PO receipts, item edits, imports); item deletes are soft
- New ledger history + integrity report endpoints and UI

**New modules**
- Purchase orders with goods receipt
- Lot/batch tracking with expiry dates and FEFO picking
- Reorder suggestions
- Stripe billing with plan limits (only enforced when Stripe keys are set)

**Quality**
- Jest + in-memory MongoDB test suite: 106 tests; GitHub Actions CI
- README rewritten; LICENSE added

## ⚠️ Before merging (merging deploys)

Set on Railway first, or the API will not start / the frontend will be blocked:
- `JWT_SECRET` — strong random value (required)
- `CLIENT_URL` — the deployed frontend origin (required for CORS)
- `DEV_MASTER_KEY` — optional, ≥16 chars, enables the developer console
- Leave `SEED_DEMO` unset

After deploying: rotate the Atlas and Cloudinary credentials, remove the `admin/admin` account from the production database, and run `node backend/scripts/migrate_ledger.js` (dry run) to see whether a ledger backfill is needed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
