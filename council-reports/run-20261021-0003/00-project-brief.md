# 00 — Project Brief: NexERP

Prepared for the Project Council run of 2026-10-21. All council members receive this same brief.
**Note on skill integrity:** the skill's reference files (`environments.md`, `lenses-by-field.md`, `severity-rubric.md`, `report-templates.md`) were missing from this installation. The severity rubric, lens translations and templates below were reconstructed by the convener to standard equivalents, so all members grade the same way. This run uses parallel subagents, so member reports are independent of each other.

## Recognised field

**Software — full-stack web application (ERP/inventory domain).** Confidence: **High.**
Signals: Node/Express backend with Mongoose models and REST routes, React/Vite frontend, package.json manifests, git repository, README describing an inventory management product.

## What the project is

NexERP is a bilingual (Arabic RTL / English LTR) inventory-management ERP for industrial warehouses. Monorepo at `D:\Web\nexerp` with:

- **backend/** (~5,800 LOC, plain JavaScript): Express 5 + Socket.IO API, MongoDB Atlas via Mongoose 9, JWT auth (bcryptjs), Cloudinary image uploads, Google Gemini AI chat (`@google/genai`), nodemailer, CSV import. 24 route modules, 23 models. Deployed to Railway (Procfile, railway.json).
- **frontend/** (~20,200 LOC): React 18 + Vite SPA, react-router 7, Recharts, socket.io-client, @zxing barcode scanning, react-joyride tours, xlsx export. Tailwind 4 installed but styling is largely inline; four icon libraries coexist.
- **nex_dashboard/** — untracked, near-empty Vite/React scaffold (stock template README), last touched 2026-05-30.
- **PDF/IMS_Blueprint_and_AI_Prompts.pdf** (added 2026-08-07, untracked) — a 13-section blueprint for a production-grade multi-tenant IMS on a different stack (TypeScript/Fastify/PostgreSQL/Next.js), with an 8-phase roadmap and AI build prompts. It represents a possible future direction, not the current system.

## Vital statistics

- 182 files outside node_modules/.git; 78 .js, 53 .jsx, 7 .cjs, 3 .py, 2 .md, 2 .env, 2 .log.
- **Last substantive code change: 2026-05-30** (≈5 months before this review). The only later additions are the blueprint PDF (Aug) and editor/settings files.
- Git: branch `b1`; main branch `main`. ~16 untracked files, mostly one-off codemod/debug scripts (`check_brace.py`, `fixAlign.cjs`, `refactorWh.cjs`, `rewrite_rounded.js`, `test_cat.js`, `backend/migrate_ledger.js`) plus server `.log` files committed into `backend/`.
- Recent commits: developer dashboard + action logging; invoice printing + live TX feed + ledger + alerts; WMS, BOM/MRP, KPI analytics, smart search, guided tour.
- No test suite, no TypeScript, no linting in backend/ or frontend/. Ad-hoc scripts `backend/test-api.js`, `backend/test.js`, a Postman collection at repo root.
- `backend/.env` and `frontend/.env` exist. **Never copy secret values into reports** — name file/line/type and mask the value.

## Key files (read these first; aim to stay within ~40 files per member)

| Area | Files |
|---|---|
| Orientation | `README.md`, `package.json`, `backend/package.json`, `frontend/package.json` |
| Backend core | `backend/server.js`, `backend/middleware/` (auth), `backend/config/db.js`, `backend/models/index.js` |
| Domain models | `backend/models/Item.js`, `Transaction.js`, `Ledger.js`, `User.js`, `Warehouse.js`, `Bin.js`, `ItemStockLocation.js`, `BomTemplate.js`, `Reservation.js` |
| Routes of interest | `backend/routes/auth.js`, `items.js`, `transactions.js`, `publicApi.js`, `ai.js`, `import.js`, `developer.js`, `admin.js` |
| Seeds/ops | `backend/seedData.js`, `backend/seed.js`, `backend/migrate_ledger.js`, `backend/Procfile`, `backend/railway.json` |
| Frontend core | `frontend/src/main.jsx`, `frontend/src/api.js`, `frontend/src/context/`, `frontend/src/components/Layout.jsx` |
| Largest pages | `frontend/src/pages/ItemPage.jsx` (1,647 ln), `Import.jsx` (1,120), `Landing.jsx` (1,014), `TxPage.jsx` (881), `BOM.jsx` (862), `Warehouses.jsx` (824) |
| Future direction | `PDF/IMS_Blueprint_and_AI_Prompts.pdf` (read structure/sections if tooling allows; a summary is in this brief) |

Skip: all `node_modules/`, `.git/`, `council-reports/`, `.idea/`, `package-lock.json` files, and the codemod scripts except to note their existence.

## Focus

General review. No specific focus question was set.

## Severity rubric (identical for all members)

- **Critical** — causes data loss/corruption, a security breach, or renders the core product unusable or undeliverable; or a legal/financial exposure that could sink the project. Act immediately.
- **High** — likely to fail or cost real money/time under normal use; must be resolved before relying on or shipping the project.
- **Medium** — real but bounded impact; should be fixed in the normal course of work.
- **Low** — hygiene, polish, or minor friction; fix opportunistically.

Grade by impact on this project's actual goals, not by theoretical worst case. Every finding must cite the file (and line/section where possible) it came from; anything not backed by a file is labelled **Assumption**.

## Member report template (use exactly this structure)

```
# <NN> — <Member name> report: NexERP
## Verdict
2–4 sentences through this member's lens.
## Findings
### F1. <Title> — <Severity>
Evidence: <file:line or file §section>
<Why it matters, through this lens. 2–6 sentences.>
Action: <concrete suggested action>
(repeat; aim for 5–10 findings that matter, not a padded list)
## Assumptions and limits
- Approx. share of the project read, and what was skipped
- Files that could not be read
- Any assumptions not backed by files
```

## Lens translations for software (this field)

1. **Contrarian** — assume the product fails in real use: data-integrity defects, security holes, concurrency/race bugs, silent failure modes, operational risks (deploy, backup, secrets), hidden costs. What breaks first and how would we know?
2. **First-principles** — what is this system truly for and for whom? Is the current architecture (Mongo/Express SPA, single-tenant, feature breadth) the right way to achieve that, or has it drifted into imitating big ERPs? What should be cut, kept, or rebuilt — including an honest read on the blueprint PDF's role?
3. **Expansionist** — unused potential: what here could be reused, productised, sold or extended (bilingual RTL UI, barcode flows, public API, demo mode, AI chat)? Nearest adjacent markets and the cheapest paths to them.
4. **Outsider** — read it as a new developer or a prospective customer would: onboarding, docs vs reality, naming, what lives only in the author's head, how long until a newcomer can run it and make a safe change.
5. **Executor** — readiness and path to done: what is actually finished vs half-built, what blocks a real deployment/sale today, effort estimates, and the order of work for the next 90 days.
