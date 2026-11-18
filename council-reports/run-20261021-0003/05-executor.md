# 05 — Executor report: NexERP

## Verdict

NexERP is a feature-complete **demo**, not a shippable product: the transaction core (atomic stock updates, ledger, multi-warehouse locations, socket broadcasts after commit) is genuinely finished and well-built, and deploy plumbing for Railway/Vercel exists, but the path to a first paying customer is blocked by a hardcoded-fallback developer master key over a raw cross-tenant DB CRUD API, default seeded credentials created on every production boot, zero tests/CI on ~26k LOC, and a half-done Tailwind migration with 15 codemod scripts abandoned in `src/`. Work stopped 2026-06-15 (last commit) and nothing substantive has moved in ~4 months; the repo is in "paused mid-sprint" state, not "done" state. Honest estimate to a defensible v1 for one real customer: **8–12 person-weeks**.

## Findings

### F1. Developer API: hardcoded fallback master key over raw cross-tenant DB CRUD — Critical
Evidence: `backend/routes/developer.js:10` (`const masterKey = process.env.DEV_MASTER_KEY || "nexdev2026";`), routes at `developer.js:165-296` (`POST /db/query/:model`, `POST /db/:model`, `PUT /db/:model/:id`, `DELETE /db/:model/:id`, settings and personnel toggles), mounted at `backend/server.js:160` (`app.use("/api/dev", developerRoutes)`).
`/api/dev` exposes query/create/update/delete on **any** Mongoose model across all companies, gated only by an `x-dev-key` header whose fallback value is committed to the repo. `DEV_MASTER_KEY` is absent from `backend/.env` (key names inspected; values masked), so every current deployment is running on the hardcoded fallback. Anyone with repo access — or who guesses the key — owns the entire database. This alone makes the current build undeployable to a paying customer.
Action: Before anything else (effort S, <1 day): remove the fallback and refuse to mount `/api/dev` unless `DEV_MASTER_KEY` is set and strong; gate the whole router behind `NODE_ENV !== 'production'` or IP allowlist; rotate the key.

### F2. Production boot auto-seeds known credentials; weak JWT fallback; open CORS — High
Evidence: `backend/server.js:163` (`connectDB(seedData)` runs on every start), `backend/seedData.js:38-44` (creates `admin/admin`, `ahmed/123`, `sara/123`, `khaled/123` whenever company NEX-01 lacks an admin), `backend/middleware/auth.js:4` (`JWT_SECRET || "nexinv_secret"`), `backend/server.js:53,74` (Socket.IO CORS `origin: "*"`; Express CORS callback allows every origin).
The same code path serves demo and production: any fresh production DB gets a publicly documented admin login (`README.md:74-78` even publishes the passwords), and if `JWT_SECRET` is unset, tokens are forgeable from a string in the repo. Fine for a demo; a sale-blocker for a real customer.
Action: Effort S–M (2–4 days): gate `seedData` behind an explicit `SEED_DEMO=true` env flag, fail startup in production when `JWT_SECRET`/`DEV_MASTER_KEY` are missing, and restrict CORS to `CLIENT_URL` (already present in `backend/.env` key list but unused by `server.js`).

### F3. `migrate_ledger.js` — uncommitted, not idempotent, run-status unknown — High
Evidence: `backend/migrate_ledger.js:14-63` (iterates **all** transactions and `Ledger.create`s one entry each, no check for existing ledger rows), `:83` (`$set: { qty, reservedQty: 0 }` overwrites ItemStockLocation and zeroes reservations), untracked per `git status`; runtime ledger writes exist since commit c6d24da (2026-05-27) at `backend/routes/transactions.js:199-219,302-314`.
This is the one-time backfill for transactions created before the ledger feature landed. There is no record of whether it was ever run against the production Atlas DB. Running it **today** would duplicate every ledger entry already written at runtime since May and wipe `reservedQty` on all stock locations — silent data corruption. Not running it (if it never ran) leaves pre-May history missing from the ledger, so ledger-based reports undercount. Either way it is a live landmine sitting untracked in the repo. Note also `backend/seed.js` creates transactions without ledger entries, which desyncs any seeded environment.
Action: Effort S (1–2 days): query prod for transactions lacking a ledger entry to establish whether it ran; if a backfill is still needed, add an idempotency guard (skip tx ids that already have ledger rows, don't touch `reservedQty`), run once, then commit the script with a "RAN ON <date>" header or delete it. Do not leave it untracked.

### F4. No tests, no CI, no lint on ~26k LOC of money-touching stock math — High
Evidence: `backend/package.json:9-13` and `frontend/package.json:5-9` (no test/lint scripts), no `.github/` directory (checked, absent), only ad-hoc scripts `backend/test-api.js`, `backend/test.js`, `backend/test-photo.js`, root `test_cat.js`; meanwhile `backend/routes/transactions.js:120-253` implements multi-item atomic stock mutation, moving-average costing (`:147-154`), and reversal/cancel logic (`:264-324`).
Every refactor (including the pending styling migration, F5) is verified by hand. For an inventory system the correctness of qty/avgCost/ledger math *is* the product; one regression at a customer destroys trust permanently. This is the single biggest multiplier on all other remaining work.
Action: Effort M (2–3 person-weeks): stand up Jest + mongodb-memory-server (replica-set mode, since the code uses sessions) and cover transactions create/cancel/edit, ledger consistency, and auth/permissions; add a GitHub Actions workflow running tests + eslint on push. Don't chase coverage; chase the stock-math paths.

### F5. Styling migration half-done: Tailwind shell over ~2,000 inline styles, codemod debris in src/ — Medium
Evidence: `frontend/src/main.jsx:3` (mounts `TailwindApp.jsx`, 10.8 KB shell); grep counts: 1,996 `style={{` occurrences across 47 files vs 693 `className=` across 29 files; largest pages are inline-styled monoliths (`frontend/src/pages/ItemPage.jsx` 89 KB, `Import.jsx` 59 KB, `Landing.jsx` 58 KB, `Warehouses.jsx` 50 KB); 15 untracked one-off codemods (`frontend/src/fixAlign.cjs`, `fixHeaders.cjs`, `makeResponsive.cjs`, `refactorWh.cjs/2.cjs`, `pages/rewrite_rounded.cjs/.js`, etc.).
Tailwind 4 is installed and the app shell uses it, but the pages were being converted by regex codemods that were abandoned mid-run. This is not a ship-blocker (the UI works), but it doubles the cost of every UI change and the untracked codemods invite accidental reruns that break JSX (the `check_brace.py`/`check_jsx_tags.py` scripts at repo root are evidence that already happened).
Action: Effort decision S, completion L: decide now — either finish the Tailwind conversion page-by-page behind the new test/CI net (~3-4 person-weeks) or declare inline styles the standard and stop. Either way, delete all codemod/check scripts from the repo this week (S, hours).

### F6. README is materially wrong about the system it documents — Medium
Evidence: `README.md:47` ("inline styles (no CSS framework)" — Tailwind 4 is installed and mounted), `:325` ("App.jsx — Entire React app (single file, ~2200 lines)" — reality is 33 page files plus components), `:339-348` (env list omits `GEMINI_API_KEY` used at `backend/routes/ai.js:53`, `DEV_MASTER_KEY`, `CLIENT_URL`, and all six SMTP vars present in `backend/.env`), `:396` (login `admin/admin` with no mention of the company code `NEX-01` that `backend/seedData.js:32` requires), no mention of warehouses/BOM/ledger/public API shipped in May commits.
For a solo project approaching hand-off or sale, the README is the deployment runbook — and following it today produces a broken deploy (missing env vars) and a failed first login. It also publishes seed passwords (F2).
Action: Effort S (1-2 days): rewrite README sections 5-9 against current reality; add `.env.example` files for backend and frontend (none exist).

### F7. nex_dashboard/ is a second, untracked client duplicating the in-app developer dashboard — Medium
Evidence: `nex_dashboard/package.json` (React 19 / Vite 8, versions ahead of the main frontend's React 18 / Vite 5), `nex_dashboard/src/App.jsx:5` (`API_BASE = 'http://localhost:5000/api'`), `:8-36` (dev-key unlock, DB explorer with create/edit JSON modal, action logs, personnel — the same surface as `/api/dev`), untracked per `git status`, `node_modules` installed on disk.
Contrary to the brief's "near-empty scaffold", it contains a working 32 KB single-file dev console. But commit 5e29a64 ("developer dashboard") suggests the same capability was also built into the main app, so this is a fork of effort nobody chose between. Untracked means it is one `git clean` away from vanishing.
Action: Effort S (half a day to decide): pick one developer-dashboard home. If keeping this, commit it (minus node_modules) and point it at `DEV_MASTER_KEY`-gated prod; otherwise delete the folder. Tied to F1 either way.

### F8. Branch and worktree state: remote is current, local checkout is stale and littered — Low
Evidence: `git log NexERP/main` shows `b1` fully merged via PR #11 (0d48f21, 2026-06-15); `git rev-list --left-right --count NexERP/main...main` → 29/0 (local `main` is 29 commits behind its remote); local `master` frozen at the 2026-05-15 initial commit; 17 untracked paths per `git status` (migrate_ledger.js, PDF/, nex_dashboard/, 13 codemod/check scripts, test_cat.js).
Good news: there is no merge debt — everything shipped is on remote main. The risk is purely local: the only unreplicated assets are the untracked files, and the valuable ones (migrate_ledger.js, nex_dashboard/, the blueprint PDF) share a directory with disposable junk, so a cleanup pass could destroy them.
Action: Effort S (hours): fast-forward local `main`, delete `master`, triage untracked files — commit migrate_ledger.js (post-F3), PDF/ blueprint, and nex_dashboard (if kept); delete the rest.

## 90-day plan (ordered)

- **Weeks 1–2 — Make the current deploy defensible (blockers):** F1 dev-key fix + rotation; F2 seed gating, JWT/CORS hardening; F3 ledger-backfill investigation and resolution; F8 branch/untracked triage. Outcome: the running Railway/Vercel deployment is no longer trivially ownable.
- **Weeks 3–5 — Safety net:** F4 test harness + CI over transactions/ledger/auth; `.env.example` + README rewrite (F6). Outcome: changes can be made without fear; a stranger can deploy from docs.
- **Weeks 6–9 — One real customer:** pick a pilot; backup/restore procedure for Atlas (currently undocumented — Assumption: none exists); per-customer company provisioning without demo seeds; fix anything the pilot surfaces. Defer the blueprint-PDF rewrite (`PDF/IMS_Blueprint_and_AI_Prompts.pdf`) — a TypeScript/Postgres rebuild is a 6-month project and starting it now guarantees neither system ships.
- **Weeks 10–13 — Pay down the UI fork:** execute the F5 styling decision; retire or commit nex_dashboard (F7); delete codemod scripts.

Total: ~8–12 person-weeks of focused work to first-paying-customer readiness; the Critical/High items (F1–F4) are ~4–5 of those weeks.

## Assumptions and limits

- Read ~30 files in full or in targeted part (~16% of the 182 project files, but covering deploy configs, seeds, server entry, auth middleware, transactions route, developer route, migration script, both package.json sets, README, gitignore, nex_dashboard scaffold) plus grep sweeps over backend/routes and frontend/src. Skipped: most of the 33 frontend pages (sampled by size/grep only), models, ai.js/import.js/publicApi.js bodies (grep-sampled), the blueprint PDF, node_modules, council-reports.
- `backend/.env` and `frontend/.env` were inspected for **key names only**; no values were read into this report. Both are correctly gitignored and untracked (verified via `git ls-files`), despite the brief's note suggesting logs were committed — `server.local.*.log` files exist on disk but are ignored.
- **Assumption:** whether `migrate_ledger.js` was ever executed against production is unknowable from the repo; F3 treats both outcomes as risks. **Assumption:** no database backup procedure exists (none found in repo or README). **Assumption:** the Railway/Vercel deployments described in README are still live; not verified from here.
- Effort estimates assume one senior full-stack developer familiar with the codebase.
