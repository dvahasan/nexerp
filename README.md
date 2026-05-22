# NexERP — نظام إدارة المخزون

> **Smart & Comprehensive Inventory Management System** · Full-stack Arabic/English bilingual ERP built for industrial warehouses.

![NexERP](https://img.shields.io/badge/NexERP-v1.1-1d4ed8?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20MongoDB-green?style=flat-square)
![RTL](https://img.shields.io/badge/language-Arabic%20%2F%20English-orange?style=flat-square)
![Deploy](https://img.shields.io/badge/backend-Railway-purple?style=flat-square)

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
   - [Authentication & Roles](#authentication--roles)
   - [Dashboard](#dashboard)
   - [Inventory Management](#inventory-management)
   - [Multi-Image Gallery](#multi-image-gallery)
   - [Transactions](#transactions)
   - [Departments & Categories](#departments--categories)
   - [User Management](#user-management)
   - [Settings & Currency](#settings--currency)
   - [Barcode / QR Scanner](#barcode--qr-scanner)
   - [Global Search](#global-search)
   - [Responsive UI & RTL](#responsive-ui--rtl)
4. [API Reference](#api-reference)
5. [Project Structure](#project-structure)
6. [Environment Variables](#environment-variables)
7. [Getting Started](#getting-started)
8. [Seeding Test Data](#seeding-test-data)
9. [Deployment](#deployment)

---

## Overview

NexERP is a production-ready inventory management system designed for Arabic-speaking industrial workplaces. It supports full bilingual operation (Arabic RTL / English LTR), granular role-based permissions, Cloudinary-hosted item photos, real-time stock tracking, and a modern responsive UI — all from a single-page React app backed by a Node/Express REST API and MongoDB Atlas.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, inline styles (no CSS framework) |
| **Backend** | Node.js, Express 5 |
| **Database** | MongoDB Atlas + Mongoose 9 |
| **Auth** | JWT (Bearer token) + bcryptjs |
| **Image Storage** | Cloudinary v2 (upload_stream via multer memoryStorage) |
| **Barcode Scan** | @zxing/browser (camera-based QR/barcode) |
| **Backend Hosting** | Railway |
| **Frontend Hosting** | Vercel (or any static host) |

---

## Features

### Authentication & Roles

- **JWT-based login** — token stored in `localStorage`, validated on every request via `Authorization: Bearer` header.
- **Four built-in roles** with cascading default permissions:

| Role | Add Items | Edit Items | Delete Items | Record Transactions | Manage Users | Manage Departments |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Warehouse** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Viewer** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

- **Per-user permission overrides** — any permission can be individually toggled on/off for a specific user, independent of their role.
- **Auto-restore session** — token and user profile are saved in `localStorage` and restored on page reload.
- **Seeded users** (created on first run):
  - `admin` / `admin` → System Admin
  - `ahmed` / `123` → Manager
  - `sara` / `123` → Warehouse Staff
  - `khaled` / `123` → Viewer

---

### Dashboard

Real-time KPI overview loaded from `/api/stats`:

- **Total Items** — count of active inventory items
- **Inventory Value** — sum of (qty × price) across all items, displayed in the configured system currency
- **Low Stock** — items where `qty > 0` and `qty ≤ minThreshold`
- **Today's Transactions** — count of IN/OUT movements recorded today
- **Recent Activity table** — last 8 transactions with date, type badge, item name, qty, source/dest, and user
- **Low stock alert banner** — shown when any item needs reordering; links directly to Inventory page

---

### Inventory Management

Full CRUD for stock items with rich metadata:

| Field | Description |
|---|---|
| **Name (AR / EN)** | Bilingual item name |
| **Description** | Free-text notes |
| **Department** | Linked department (colored badge) |
| **Category** | Sub-category within a department |
| **SKU** | Internal stock-keeping code |
| **Barcode / QR** | Scannable code (manual entry or camera scan) |
| **Price** | Unit cost in the configured system currency |
| **Quantity** | Current stock level (updated automatically by transactions) |
| **Min. Threshold** | Reorder alert trigger level |
| **Package Type** | unit · box · pack · group · roll · bag · pallet |
| **Units per Package** | Number of individual units inside a box/pack/group/bag/pallet (hidden for unit/roll) |
| **Datasheet No.** | Catalog or datasheet reference number |
| **Status** | active · inactive · discontinued |
| **Photos** | Multiple Cloudinary-hosted images |

**Inventory list features:**
- Filter by department, status, or free-text search (name, SKU, barcode)
- Card grid view with stock-level color badge (green / amber / red)
- Per-item quick actions: View detail, Edit, Record transaction, Delete
- Pagination with configurable page size (10 / 15 / 25 / 50 / 100)

**Item detail page:**
- Full multi-image carousel with thumbnail strip and image counter
- All metadata displayed in a responsive grid
- Full transaction history for that item (paginated)
- Quick action buttons: Edit, Record Transaction, Back

---

### Multi-Image Gallery

Each item can have **multiple photos** stored in Cloudinary:

- **Upload** — select one or more files in the item form; each is uploaded via `POST /api/items/:id/photos`
- **Primary photo** — the first image is also stored in the legacy `photo` field for backward compatibility
- **Carousel view** — prev/next navigation buttons, thumbnail strip, `X / N` counter
- **Delete individual photo** — trash button per thumbnail calls `DELETE /api/items/:id/photos/:publicId`, removes from Cloudinary and from the DB array; automatically promotes the next image as primary
- **objectFit: contain** — images are never cropped; always shown full

---

### Transactions

Stock movements recorded with full traceability:

| Field | Description |
|---|---|
| **Type** | IN (stock received) or OUT (stock issued) |
| **Item** | Searchable combobox with name + SKU |
| **Quantity** | Units moved; stock is updated atomically |
| **Source / Supplier** | Origin for IN transactions |
| **Destination / Project** | Recipient for OUT transactions |
| **Date** | Defaults to today; can be back-dated |
| **Notes** | Free-text memo |

**Transaction list features:**
- Filter by type (All / IN / OUT) and free-text search (item name, source, destination)
- Sorted newest-first with pagination
- **Admin CRUD** — admin users see ✏️ edit and 🗑 delete buttons per row:
  - **Edit** opens `TxEditModal` — change type, qty, date, source, dest, notes; the old stock effect is fully reversed before the new one is applied (using MongoDB sessions for atomicity)
  - **Delete** reverses the stock effect and removes the record (also atomic)

---

### Departments & Categories

Organisational structure for inventory:

- **Departments** — top-level grouping with a color picker (shown as badge)
- **Categories** — belong to one department; used for sub-filtering
- Add / delete either (with guard: cannot delete if items are assigned)
- Displayed as two-column layout; responsive single-column on mobile

---

### User Management

*(Admin only)*

- **Create users** — name (AR/EN), username, email, password, role
- **Edit users** — all fields; leave password blank to keep existing
- **Activate / Deactivate** — toggle user access without deleting
- **Delete users** — guard prevents deleting yourself
- **Permission overrides** — per-user checkboxes override the role defaults
- **User detail view** — joined date, last active, total transaction count
- **My Profile page** — any user can view their own permissions (allowed / denied per key)

---

### Settings & Currency

*(Admin only — Settings page)*

**Currency Module:**
- Choose the system-wide display currency from 14 options:

| Code | Symbol | Currency |
|---|---|---|
| USD | $ | US Dollar |
| EUR | € | Euro |
| GBP | £ | British Pound |
| EGP | ج.م | Egyptian Pound |
| SAR | ر.س | Saudi Riyal |
| AED | د.إ | UAE Dirham |
| QAR | ر.ق | Qatari Riyal |
| KWD | د.ك | Kuwaiti Dinar |
| BHD | د.ب | Bahraini Dinar |
| OMR | ر.ع | Omani Rial |
| JOD | د.أ | Jordanian Dinar |
| TRY | ₺ | Turkish Lira |
| INR | ₹ | Indian Rupee |
| PKR | ₨ | Pakistani Rupee |

- Setting is persisted to MongoDB via `PUT /api/settings` and loaded on startup
- Currency symbol is applied everywhere a monetary value appears (Dashboard value KPI, item price, item detail)

**Cloudinary Storage Gauge:**
- Fetches live usage from `/api/admin/cloudinary` (proxies `cloudinary.api.usage()`)
- Shows two progress bars: **Storage** (bytes used / limit) and **Transformations** (count used / limit)
- Color-coded: green < 50% · amber 50–80% · red > 80%

**System Info card:**
- Version, database, cloud storage, and hosting platform

---

### Barcode / QR Scanner

Built with `@zxing/browser` for camera-based scanning:

- **Scan Barcode button** in the item form opens a full camera overlay
- Continuous frame scanning — detects and highlights the code as soon as it appears
- Falls back to manual text entry if camera access is denied or the browser doesn't support the API
- **Barcode lookup** — typing a barcode in the Transactions form or using the scan button performs a `GET /api/items/barcode/:code` lookup and auto-fills the item

---

### Global Search

Instant cross-entity search in the top navigation bar:

- Searches simultaneously across **Items** (name, nameEn, SKU, barcode), **Transactions** (item name, source, dest, user), **Users** (name, username, email), and **Departments** (name, nameEn)
- Results grouped by entity type with icons
- Clicking a result navigates directly to the item detail page or the relevant section
- Dropdown closes on outside click; cleared with ✕ button

---

### Responsive UI & RTL

- **Full RTL support** — all layouts, sidebars, dropdowns, and modals flip correctly for Arabic
- **Language toggle** — switch between العربية and English; preference stored per session; both login screen and app shell have the toggle
- **Mobile-first sidebar** — collapses to a hamburger menu on narrow screens with an overlay backdrop; auto-expands on desktop
- **Responsive grids** — inventory cards, KPI panels, department layout, and user tables all adapt to mobile / tablet / desktop breakpoints
- **Sticky top bar** — always-visible header with hamburger, global search, and contextual action buttons
- **Fonts** — Noto Sans Arabic loaded from Google Fonts for crisp Arabic rendering

---

## API Reference

All routes require `Authorization: Bearer <token>` except `/api/auth/login`.

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Login → returns `{token, user}` |
| GET | `/api/auth/me` | Returns current user |

### Items
| Method | Route | Permission | Description |
|---|---|---|---|
| GET | `/api/items` | Any | List items (supports `?search=`, `?dept=`, `?status=`) |
| GET | `/api/items/:id` | Any | Get single item |
| GET | `/api/items/barcode/:code` | Any | Lookup by barcode |
| POST | `/api/items` | canAdd | Create item |
| PUT | `/api/items/:id` | canEdit | Update item |
| DELETE | `/api/items/:id` | canDelete | Delete item |
| POST | `/api/items/:id/photo` | canEdit | Upload/replace primary photo |
| POST | `/api/items/:id/photos` | canEdit | Add extra photo to gallery |
| DELETE | `/api/items/:id/photos/:publicId` | canEdit | Remove photo from gallery |

### Transactions
| Method | Route | Permission | Description |
|---|---|---|---|
| GET | `/api/transactions` | Any | List (supports `?itemId=`, `?type=`) |
| POST | `/api/transactions` | canTx | Record new transaction (atomic stock update) |
| PUT | `/api/transactions/:id` | canManageUsers | Edit transaction (reverses old, applies new) |
| DELETE | `/api/transactions/:id` | canManageUsers | Delete transaction (reverses stock) |

### Departments & Categories
| Method | Route | Permission |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/departments` | canManageDepts |
| GET/POST/DELETE | `/api/categories` | canManageDepts |

### Users
| Method | Route | Permission |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/users` | canManageUsers |

### Settings & Admin
| Method | Route | Description |
|---|---|---|
| GET | `/api/settings` | Get all settings as `{key:value}` |
| PUT | `/api/settings` | Upsert settings (admin only) |
| GET | `/api/stats` | Dashboard KPIs |
| GET | `/api/admin/cloudinary` | Cloudinary usage stats (admin only) |

---

## Project Structure

```
nexerp/
├── backend/
│   ├── server.js           # Single-file Express API (all routes, models, middleware)
│   ├── seed.js             # One-time seed script for initial data
│   ├── seed-test-data.js   # Test data: 10 items + 39 transactions
│   ├── railway.json        # Railway deployment config
│   ├── Procfile            # web: node server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Entire React app (single file, ~2200 lines)
│   │   ├── api.js          # All fetch calls to the backend
│   │   └── main.jsx        # React entry point
│   ├── public/
│   │   └── favicon.svg     # Custom blue box/warehouse SVG icon
│   ├── index.html
│   └── package.json
└── package.json            # Root: concurrently dev script
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/nexerp
JWT_SECRET=your_jwt_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=https://your-backend.railway.app/api
```

> In development, the Vite dev server proxies `/api` to `http://localhost:5000` automatically.

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier works)
- Cloudinary account (free tier works)

### 1. Clone & Install

```bash
git clone https://github.com/dvahasan/nexerp.git
cd nexerp

# Install root dev dependencies (concurrently)
npm install

# Install backend
cd backend && npm install && cd ..

# Install frontend
cd frontend && npm install && cd ..
```

### 2. Configure Environment

Create `backend/.env` with the variables listed above.

### 3. Run in Development

```bash
# From the repo root — starts both backend (port 5000) and frontend (port 5173)
npm run dev
```

The backend auto-seeds the admin user and departments/categories on first startup.  
Open `http://localhost:5173` and login with `admin` / `admin`.

---

## Seeding Test Data

After the app has run at least once (to create the admin user and departments), you can seed realistic test data:

```bash
cd backend
node seed-test-data.js
```

This creates **10 items** and **39 transactions** covering every test scenario:

| Scenario | Item |
|---|---|
| Normal healthy stock + datasheet | 3-Phase Circuit Breaker 100A |
| ⚠️ Low stock | Control Valve DN50 PN16 |
| 🔴 Out of stock | Flexible Coupling DN100 |
| Box type · unitsPerPackage=50 | Stainless Bolts M12×50 |
| Pack type · unitsPerPackage=10 | Check Valve 1 inch |
| Roll type (high qty) | Control Cable 4×1.5mm |
| High-value IT item + datasheet | Network Switch 24-Port |
| Bag type · unitsPerPackage=20 | Hose Fitting Kit |
| Discontinued item | DC Analog Motor 2HP |
| Pallet type · unitsPerPackage=25 | GI Pipe 2 inch Galvanized |

The script is **safe to re-run** — it skips any SKU or transaction that already exists.

---

## Deployment

### Backend → Railway

1. Push to GitHub.
2. Create a new Railway project → **Deploy from GitHub repo**.
3. Set the **Root Directory** to `backend/`.
4. Add all environment variables in the Railway dashboard.
5. Railway uses `Procfile` (`web: node server.js`) to start the server.

### Frontend → Vercel

1. Import the repo in Vercel.
2. Set the **Root Directory** to `frontend/`.
3. Add `VITE_API_URL=https://your-backend.railway.app/api` as an environment variable.
4. Build command: `npm run build` · Output: `dist/`.

---

## License

MIT
