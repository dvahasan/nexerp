# NexERP — نظام إدارة المخزون

> **Smart & Comprehensive Inventory Management System** · Full-stack Arabic/English bilingual inventory SaaS for industrial warehouses and SMBs.

![Stack](https://img.shields.io/badge/stack-React%2018%20%2B%20Express%205%20%2B%20MongoDB-green?style=flat-square)
![RTL](https://img.shields.io/badge/language-Arabic%20%2F%20English-orange?style=flat-square)
![Tests](https://img.shields.io/badge/tests-Jest%20%2B%20mongodb--memory--server-blue?style=flat-square)

---

## Overview

NexERP is a multi-tenant inventory management system with full bilingual operation (Arabic RTL / English LTR). Each registered company is an isolated workspace with its own users, roles, items, warehouses and transaction history. The backend is a Node/Express REST API with Socket.IO live updates; the frontend is a React SPA.

**Core capabilities**

- **Inventory** — items with multi-image galleries (Cloudinary), categories/departments, custom attributes, soft delete, favorites, datasheets
- **Transactions** — atomic multi-item stock IN/OUT (MongoDB sessions), moving-average cost, soft-cancel with reversal, invoice printing (bilingual, stamped, A4/A5)
- **Stock ledger** — double-entry-style audit trail per movement, item history, and a company-wide integrity report (`/api/ledger/integrity`) that flags drift between ledger sums and item quantities
- **WMS** — warehouses, bins, per-location stock tracking, transfers
- **BOM / production** — bill-of-material templates and production runs
- **Roles & permissions** — owner/admin/manager/warehouse/viewer with per-user permission overrides
- **Enterprise mode** — one login managing multiple isolated company workspaces
- **Public API** — API-key-authenticated `GET /api/public/items` and idempotent `POST /api/public/checkout` for POS/e-commerce integrations
- **Extras** — camera barcode scanning + internet product enrichment, AI chat (Gemini) over live inventory, AI-assisted CSV import, KPI dashboards, alerts, guided tour, demo mode, action logging

---

## Project Structure

```
nexerp/
├── backend/                 # Express 5 API
│   ├── server.js            # App entry: middleware, route mounts, Socket.IO
│   ├── config/              # db connect, cloudinary
│   ├── middleware/          # JWT auth, roles/permissions, upload
│   ├── models/              # 23 Mongoose models (Item, Transaction, Ledger, …)
│   ├── routes/              # 25 route modules (one per resource)
│   ├── services/            # AlertService
│   ├── utils/               # broadcast (Socket.IO), rateLimit, sanitize
│   ├── scripts/             # one-off maintenance (migrate_ledger.js — idempotent)
│   ├── tests/               # Jest + supertest + mongodb-memory-server
│   └── seed*.js             # seed scripts (see table below)
├── frontend/                # React 18 + Vite SPA
│   └── src/
│       ├── TailwindApp.jsx  # App shell & routing
│       ├── pages/           # 33 page components
│       ├── components/      # Layout, scanner, invoice print, AI chat, …
│       └── context/         # App/Tour contexts
└── package.json             # Root: `npm run dev` runs both via concurrently
```

---

## Environment Variables

Complete reference in [backend/.env.example](backend/.env.example) and [frontend/.env.example](frontend/.env.example).

| Variable | Required | Effect when missing |
|---|---|---|
| `MONGODB_URI` (alias `MONGO_URL`) | **Yes** | Server exits at startup |
| `JWT_SECRET` | **Yes** | Server refuses to start (no insecure fallback) |
| `DEV_MASTER_KEY` (≥16 chars) | No | `/api/dev` developer console stays disabled |
| `SEED_DEMO=true` | No | Demo company `NEX-01` + demo users are NOT seeded (leave unset in production) |
| `CLIENT_URL` | Prod | Browser requests from the deployed frontend are CORS-blocked (comma-separated origins; localhost dev ports always allowed) |
| `GEMINI_API_KEY` | No | AI chat and AI CSV mapping silently fall back to keyword/heuristic mode |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | No | Image/logo/stamp uploads fail |
| `SMTP_HOST/PORT/SECURE/USER/PASS/FROM` | No | Welcome emails are skipped |
| `PORT` | No | Defaults to 5000 |
| `VITE_API_URL` (frontend) | Prod | Dev uses the Vite proxy to `localhost:5000` |

---

## Getting Started

Prerequisites: Node.js 20+, MongoDB (local or Atlas), optionally Cloudinary.

```bash
git clone <repo-url> && cd nexerp
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

1. Copy `backend/.env.example` → `backend/.env` and fill in `MONGODB_URI` and a strong `JWT_SECRET`.
2. For demo data on first boot, set `SEED_DEMO=true`.
3. From the repo root:

```bash
npm run dev
```

Backend starts on port 5000, frontend on 5173.

**First login (seeded demo):** Company code `NEX-01` · username `admin` · password `admin`.
Other seeded users: `ahmed`/`123` (manager), `sara`/`123` (warehouse), `khaled`/`123` (viewer).
⚠️ These are demo credentials — never run `SEED_DEMO=true` against a production database.

**Registering a real company:** use the Register page (`/register`) — it creates a company with a generated company code (shown once and emailed), plus an owner account. Enterprise accounts (multi-company) register with the "Enterprise" toggle and log in without a company code.

---

## Seed Scripts

| Script | Command | What it does | Destructive? |
|---|---|---|---|
| `seedData.js` | auto (only when `SEED_DEMO=true`) | Creates demo company NEX-01, 4 users, departments/categories/items if missing | No |
| `seed.js` | `npm run seed` | **Wipes and rebuilds** the database | **YES** |
| `seed-test-data.js` | `node seed-test-data.js` | 10 items + 39 transactions covering edge cases; skips existing SKUs | No |
| `seed-transactions.js` | `node seed-transactions.js` | Extra transaction history | No |
| `seedEnterprise.js` | `node seedEnterprise.js` | Demo enterprise account with multiple companies | No |
| `scripts/migrate_ledger.js` | `node scripts/migrate_ledger.js [--apply]` | Backfills ledger entries for pre-ledger transactions; idempotent, dry-run by default | No (with care) |

---

## API Overview

All `/api/*` routes except auth, public and track-demo require `Authorization: Bearer <JWT>`.

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login` (rate-limited), `GET /api/auth/me`, `PUT /api/auth/profile` |
| Items | `GET/POST /api/items`, `GET/PUT/DELETE /api/items/:id`, photo upload/enrichment |
| Transactions | `GET/POST /api/transactions` (atomic, multi-item), `GET /api/transactions/invoice/:no`, `PUT /api/transactions/:id` (soft-cancel only) |
| Ledger | `GET /api/ledger`, `GET /api/ledger/item/:itemId`, `GET /api/ledger/integrity` (admin) |
| Reference data | `/api/departments`, `/api/categories`, `/api/sources`, `/api/destinations`, `/api/projects`, `/api/reasons` |
| WMS | `/api/warehouses`, `/api/bins` |
| BOM | `/api/bom` (templates + production) |
| Company & users | `/api/company` (whitelisted fields), `/api/users` (whitelisted fields), `/api/settings` |
| Enterprise | `/api/enterprise/companies`, `/api/enterprise/assume/:companyId`, `/api/enterprise/exit` |
| Analytics | `/api/stats` |
| Import | `POST /api/import/csv` (requires `canAdd`, 10 MB cap) |
| Barcode | `/api/barcode/*` (camera scan lookup + enrichment) |
| AI | `POST /api/ai/chat` (Gemini-grounded, falls back to heuristics without a key) |
| Public API | `GET /api/public/items`, `POST /api/public/checkout` — header `x-api-key` (generate keys in Settings → API) |
| Developer | `/api/dev/*` — only mounted when `DEV_MASTER_KEY` is set; header `x-dev-key` |
| Health | `GET /health` — 200 when DB connected, 503 otherwise |

**Public checkout** requires an `idempotencyKey`; replays return the original invoice without double-decrementing (enforced by a unique index).

---

## Roles & Default Permissions

| Role | Add/Edit/Delete items | Tx IN | Tx OUT | Manage users | Manage depts | Manage company |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| owner / admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| manager | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| warehouse | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| viewer | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

Any permission can be overridden per user by someone with `canManagePermissions`. Owner permissions are immutable, and owners can never be created or promoted through the API.

---

## Testing

```bash
cd backend
npm test
```

Jest + supertest against an in-memory MongoDB **replica set** (transactions need sessions; the first run downloads a mongod binary). Suites cover the transaction engine (stock math, moving-average cost, atomic rollback, soft-cancel, the ledger-sum invariant), the ledger endpoints, the public API (auth, idempotency, rollback), and security regressions (mass-assignment, secret redaction). CI runs tests + the frontend build on every push/PR ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

---

## Deployment

**Backend → Railway**: root directory `backend/`, `Procfile` starts `node server.js`. Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (your frontend origin), optionally `DEV_MASTER_KEY`, Cloudinary and SMTP vars. Leave `SEED_DEMO` unset. A `/health` endpoint reports DB connectivity; the process exits on a failed initial DB connection so the platform restart policy applies.

**Frontend → Vercel** (or any static host): root directory `frontend/`, build `npm run build`, output `dist/`, env `VITE_API_URL=https://<your-backend>/api`.

---

## License

MIT — see [LICENSE](LICENSE).
