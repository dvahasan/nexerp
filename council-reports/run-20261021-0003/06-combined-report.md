# 06 — Combined Council Report: NexERP

Convened 2026-10-21; combined 2026-11-06. Field: software (full-stack web ERP), confidence High. Mode: five independent parallel subagents; no member saw another's report. The skill's reference files were missing from this installation, so the rubric/templates were reconstructed by the convener (noted in the brief); all members graded on the same reconstructed rubric.

## Combined verdict

NexERP is a capable, nearly-sellable bilingual inventory SaaS **paused mid-sprint**, not a finished product — and what blocks it is not missing ERP features but self-inflicted wounds: a committed-fallback developer master key over cross-tenant database CRUD, auto-seeded `admin/admin` owner credentials on every production boot, a mass-assignment path to cross-tenant takeover, and zero automated tests over the stock math that *is* the product. All five members, from five different lenses, independently converged on the same first move (close the back doors) and the same strategic call (demote the blueprint PDF from roadmap to reference material and finish what exists). Honest consensus estimate to a defensible v1 for a first real customer: **8–12 person-weeks**, of which the first ~1–2 weeks are non-negotiable security hardening.

## Where the five lenses converge (strongest signal)

| # | Converged finding | Flagged by | Severity |
|---|---|---|---|
| C1 | **Dev "god-mode" API** — `DEV_MASTER_KEY \|\| "nexdev2026"` fallback (developer.js:10) guards raw query/create/update/delete on every model across all tenants; excluded from action logging; key absent from the reference .env, so deployments run on the fallback | **All five** (01-F1, 02-F5, 03-F9, 04-F4, 05-F1) | Critical |
| C2 | **Production boot seeds known credentials** — `NEX-01/admin/admin` (+ `123` users) recreated on every cold start; passwords published in README; no login rate-limiting | 01-F2, 04-F2, 05-F2 | Critical |
| C3 | **Zero tests/CI/lint on money-touching stock math** (atomic tx create, moving-average cost, cancel-reversal) — every change is a leap of faith | 01-F10, 02-F7, 04-F7, 05-F4 | High |
| C4 | **Public checkout API cannot work end-to-end** — API-key shape disagrees across UI/schema/lookup (Settings.jsx:568 vs Company.js:36 vs publicApi.js:20); `req.company.ownerId` doesn't exist → `Transaction.userId` (required) is null → every checkout fails validation; idempotency check is non-atomic on a non-unique index | 01-F6, 03-F2 (02-F8 praised its design) | High |
| C5 | **Secret hygiene** — `JWT_SECRET \|\| "nexinv_secret"` fallback; register route logs plaintext passwords to stdout (auth.js:19); CORS reflects any origin with credentials; login response returns `passwordHash` and company `apiKeys` to every role | 01-F4/F5, 02-F5, 04-F4, 05-F2 | High |
| C6 | **Stock truth fragmented / ledger drift** — `Item.qty`, `ItemStockLocation.qty` and `Ledger` can diverge (location rows only updated when `warehouseId` present; direct qty edits and hard deletes bypass the ledger); `migrate_ledger.js` sits untracked, non-idempotent, run-status unknown | 01-F7, 02-F3/F4, 05-F3 | High |
| C7 | **README documents an app that no longer exists** — wrong structure, wrong permissions table, ~⅔ of API missing, documented first login fails (no company code), env vars half-documented, no .env.example, "MIT" with no LICENSE file | 04-F1/F2/F3/F9, 05-F6, 02-F1 | High (for any hand-off/sale) |
| C8 | **The blueprint PDF is reference material, not the plan** — a 14–18-month Odoo-class rebuild on a different stack; executing it now discards the defensible assets (RTL UI, working tx engine) and guarantees months with no shippable product. Extract three ideas only: authoritative ledger, ledger-sum integrity test, reorder rules | 02-F6, 03-F10, 05 (90-day plan) | High (strategic) |
| C9 | **Repo hygiene erodes trust** — 15+ untracked codemod/check scripts (some that already broke JSX), a stray `{backend,frontend` directory, five overlapping seed scripts (one destructive), half-done Tailwind migration, duplicate dev consoles (in-app + nex_dashboard) | 04-F6/F8, 05-F5/F7/F8, 02-F8 | Medium |

## Conflicts between members — checked against the code by the convener

1. **"Ledger core is genuinely done" (05) vs "Ledger is written but never read" (02).** Both are right, and the synthesis matters: the *write* path is finished and atomic (insert sites in transactions.js:219, bom.js:196, publicApi.js:127 — verified), but **no route anywhere reads a Ledger document** (grep over backend/routes: zero read sites — verified 2026-11-06). The product keeps an audit trail no screen or API can show. The cheapest high-value feature in the backlog is a ledger read/history endpoint.
2. **"Public API genuinely well-designed" (02-F8) vs "dead on arrival" (01-F6, 03-F2).** Verified: `Company.js` has no `owner`/`ownerId` field, `publicApi.js:103` falls back to `null`, and `Transaction.js:14` requires `userId` — so every checkout fails validation. Synthesis: the *design* (idempotency, session, atomic `$gte` decrement) is good and worth keeping; the *implementation* was never run end-to-end. Not a true conflict: 02 judged architecture, 01/03 judged function.
3. **Brief said logs were "committed into backend/"** — 04 and 05 both checked `git ls-files`: the `.log` files are untracked and gitignored (and 0 bytes). The brief was wrong; members' correction stands.
4. **Brief called nex_dashboard a "near-empty scaffold"** — 05 read it: it is a working ~32 KB single-file dev console (React 19/Vite 8) duplicating the in-app developer dashboard. The brief understated it; treat as a fork to retire or commit (05-F7).
5. **"Last substantive change 2026-05-30" (brief, by file mtime) vs "last commit 2026-06-15" (05, by git log — PR #11 merge).** Both true on their own measure; the project was idle ~4–5 months either way, with the blueprint PDF (Aug 7) the only artifact since.

## What each lens contributed that no other did

- **Contrarian (01):** the full cross-tenant takeover chain via mass assignment (`PUT /api/users/:id` accepts `isEnterprise`/`ownedCompanies` → enterprise login → `/assume/:companyId`), plaintext-password logging, SSRF via photo-from-url, import route callable by viewers with unvalidated LLM column maps, and the ops blind spot (server keeps serving with no DB; no /health; migration-by-hand).
- **First-principles (02):** the three-identities diagnosis (README internal tool vs SaaS landing vs blueprint rebuild) and the ruling that the next commit should be a *decision*, not a feature; the keep/cut list (keep tx engine, barcode, bilingual UI, import; freeze BOM, enterprise dashboard, warehouse volumetrics); dead scaffolding (Reservation/reservedQty: zero route references — verified).
- **Expansionist (03):** the monetisation map — billing is the single largest asset-to-revenue gap (pricing UI exists, no payment rail, advertised plan limits enforced nowhere); the barcode-enrichment flow as the demo-winning wedge (with a licensing caveat on the trial UPC endpoint); demo funnel captures traffic but has no conversion path; enterprise tier is a partner/channel product in disguise; ZATCA/ETA e-invoicing as the real regional unlock.
- **Outsider (04):** the documented first login *fails* (undocumented company code); env docs cover ~half of what the code reads and the reference .env itself lacks `GEMINI_API_KEY`/`DEV_MASTER_KEY` (so even the author runs AI in silent fallback mode); the AI assistant silently degrades to keyword matching — an evaluator-trust landmine; MIT claimed with no LICENSE file.
- **Executor (05):** remote `main` is fully merged (no merge debt; local checkout merely stale); `migrate_ledger.js` is a live landmine *in both directions* (running it duplicates ledger rows and zeroes reservations; never having run it means pre-May history is missing); concrete effort sizing and the 90-day order of work.

## Merged priority plan

**P0 — Close the back doors (days, not weeks; before the demo link is shared again):**
1. Remove both hardcoded fallbacks; refuse to boot without `JWT_SECRET`, refuse to mount `/api/dev` without a strong `DEV_MASTER_KEY` (or strip the raw-CRUD explorer entirely); rotate the key, the Atlas and Cloudinary credentials (C1, C5).
2. Gate `seedData()` behind `SEED_DEMO=true`; rate-limit `/api/auth/*`; delete the password-logging line auth.js:19 (C2, C5).
3. Whitelist updatable fields on `PUT /api/users/:id` and `PUT /api/company` (never `isEnterprise`, `ownedCompanies`, `companyId`, `apiKeys`); strip `passwordHash`/API keys from login responses; pin CORS to real origins (01-F3/F5).
4. Delete or key-protect `/api/enterprise/create`; decide the fate of `/track-demo` geolocation (01-F8).

**P1 — Safety net (weeks 2–4):** Jest + mongodb-memory-server (replica-set mode) over tx create/cancel, insufficient stock, avgCost, and the ledger-sum invariant `Σ Ledger.qtyChange == Item.qty`; GitHub Actions CI; `/health` endpoint + exit-on-failed-DB-connect; map domain errors to 4xx; triage `migrate_ledger.js` (query prod for txs lacking ledger rows, add idempotency guard, run-or-retire, then commit or delete it) (C3, C6, 01-F10, 05-F3).

**P2 — Finish what's half-built (weeks 4–7):** repair the public-API key pipeline (server-side `crypto.randomBytes` keys, hashed at rest, `"apiKeys.key"` lookup, real acting user, unique partial index on `(companyId, idempotencyKey)`), then integration-test one real checkout; add the ledger read/history endpoint; route qty edits through ADJUST transactions and soft-delete items; rewrite the README against reality + `.env.example` files + LICENSE; repo cleanup (codemods, stray dir, seed-script consolidation, nex_dashboard decision) (C4, C6, C7, C9).

**P3 — Product (after P0–P2, gated on the identity decision 02-F1):** billing + plan enforcement; demo-to-signup conversion; bilingual landing (Arabic default); reorder alerts from the existing fields. The blueprint stays reference material until revenue exists (C8).

## Limits of this review

- Each member read ~15–20% of non-vendor files by count (but deliberately the architectural/security spine; the Contrarian covered ~70–80% of backend LOC). Large frontend pages (ItemPage, Import, Warehouses) were sized and sampled, not read line-by-line; WMS/bin/stats/files routes went largely unread — similar mass-assignment patterns may recur there (01's assumption).
- Nothing was executed; "never worked end-to-end" claims are inferred from mutually independent code defects (three for the public API), now partially re-verified by the convener via grep (ownerId absent, Ledger write-only, reservedQty route-unused).
- `.env` files were inspected by key *names* only; no secret values appear in any report. Whether `DEV_MASTER_KEY`/`JWT_SECRET` are set on the live Railway deployment could not be verified from the repo — the Critical grades hold either way (seeded credentials and committed fallbacks).
- The Expansionist could not parse the blueprint PDF and relied on the brief's summary; the First-principles member decoded it fully — blueprint conclusions rest on 02's verbatim extraction.
- The brief itself contained two errors (logs "committed", nex_dashboard "near-empty") that members corrected from git; corrections adopted above.
- Combined by the same convener who wrote the brief, on 2026-11-06, 16 days after the member reports; the codebase was unchanged in between (verified: no file under backend/ or frontend/ modified since 2026-09-01 except .claude settings).
