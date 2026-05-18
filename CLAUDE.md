# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Warehouse Management System (WMS) — full-stack platform for inventory, supply chain, and warehouse operations.
- **Frontend**: Next.js 14 (React) + Material-UI, port 3000
- **Backend**: Express.js + Node.js, port 5001
- **Database**: MongoDB + Mongoose ODM
- **Real-time**: Socket.io
- **Auth**: JWT (7-day expiry), role-based access control

## Development Commands

```bash
npm run install-all    # Install all dependencies (root + backend + frontend)
npm run dev            # Run both servers concurrently (backend :5001, frontend :3000)
npm run backend        # Backend only (nodemon)
npm run frontend       # Frontend only (Next.js dev)
npm run seed           # Seed MongoDB with sample data
npm run init           # Initialize backend system data
npm run kill-ports     # Kill processes on ports 3000 and 5001
npm run build --prefix frontend   # Production frontend build
```

## Architecture

### Invoice Model — Single Collection, Multiple Types
All invoices (customer, service, sub-dealer) are stored in **one `Invoice` model** discriminated by the `invoiceType` field. Always pass `invoiceType: 'customer' | 'service' | 'sub-dealer'` when creating or querying:
```js
// Backend query pattern
Invoice.find({ invoiceType: 'customer', ...dateFilter })
// Frontend fetch pattern
api.get('/invoices', { params: { invoiceType: 'customer', page, limit } })
```

### API Client — `frontend/utils/api.js`
The axios instance (`api`) automatically attaches the JWT from `localStorage` key **`wms_token`** (not `token`). Two export functions exist for reports — use the correct one:
- `getReports(type, params)` → `GET /reports/:type` — fetches report data
- `exportReportExcel(type, params)` → `GET /reports/export/:type` — downloads Excel (correct)
- `exportReport(type, params)` → `GET /reports/:type/export` — **wrong path**, do not use

### Status Values — Normalization Required
The database stores payment/invoice statuses in **lowercase** (`paid`, `pending`, `due`). The UI `STATUS_COLORS` map and MUI `Select` components expect **capitalized** values (`Paid`, `Pending`, `Due`). Always normalize when reading from DB:
```js
const normalizeStatus = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : 'Pending';
// Always use normalizeStatus() in openEdit() and anywhere DB status feeds a Select or STATUS_COLORS lookup
```

### Installer N/A Matching
Multiple pages filter invoices by "no installer assigned." The canonical check:
```js
const isInstallerNA = (inv) => {
  const name = String(inv.installerName || inv.installer?.name || inv.installer || '').trim().toLowerCase();
  return !name || ['n/a', 'na', 'none', 'null', 'undefined', '-'].includes(name);
};
```

### Dashboard Data Flow
`GET /api/dashboard` returns a `data` object including `isAdmin` (bool) and `branchInfo`. The dashboard uses `dashData.isAdmin !== false` to toggle between admin-wide view and branch-scoped view. Users without a branch assignment receive `noBranchAssigned: true` and see an empty state.

### Reports Backend — `backend/routes/reports.js`
- `GET /reports/sales` and `GET /reports/services` support a `raw=true` query param
  - **Without `raw`**: returns aggregated period-grouped data (`{ items, totals }`)
  - **With `raw=true`**: returns one row per invoice item — use this for printable/exportable reports
- `GET /reports/export/:type` generates and streams an Excel file (XLSX)
- Date filtering uses `invoiceDate` field (not `createdAt`) via `buildDateMatch()`

### Frontend Components
- **`DataTable`** (`components/Common/DataTable.js`): Accepts `columns`, `rows`, `page`, `rowsPerPage`, `total`, `onPageChange`, `onRowsPerPageChange`, `searchValue`, `onSearchChange`. Renders the MUI table with pagination. Server-side pagination: pages manage their own `page`/`rowsPerPage` state and refetch.
- **`FormDialog`** (`components/Common/FormDialog.js`): MUI Dialog wrapper with submit/cancel. Pass `open`, `onClose`, `onSubmit`, `title`, `loading`, `maxWidth`.
- **`AdminConfirmDialog`** (`components/Common/AdminConfirmDialog.js`): Requires admin password before confirming destructive actions (DELETE).
- **`InvoicePrint`** (`components/Invoice/InvoicePrint.js`): Printable invoice view, used with `react-to-print` via a `ref`.
- **`ReportPrint`** (`components/Reports/ReportPrint.js`): Printable report view, same pattern.

### Context Providers
- **`AuthContext`**: Exposes `user`, `login()`, `logout()`. JWT stored at `localStorage.wms_token`.
- **`SettingsContext`**: Exposes `company` (name, logo, address, tinNo) used in print headers.
- **`PermissionsContext`**: Fine-grained permission flags derived from user role.

### Position-Based Employee Colors
Employees and installers display a colored MUI `Chip` based on their `position` field:
```js
const POSITION_COLORS = {
  'Installer': 'success', 'Duct Installer': 'success', 'Technician': 'success',
  'Engineer': 'info', 'Accounting Officer': 'info',
  'Manager': 'primary', 'Sales Representative': 'warning',
  'Cashier': 'secondary', 'Supervisor': 'error', 'Admin': 'default',
};
```

### Backend Middleware Chain
Every protected route uses at minimum `protect` (JWT validation). DELETE routes also require `adminPasswordAuth`. The `protect` middleware attaches `req.user`; use `req.io` to emit Socket.io events within routes.

## Key Environment Variables

### Backend (`.env`)
```
PORT=5001
MONGODB_URI=<connection string>
MONGODB_DB=dashboard_db
JWT_SECRET=wms_super_secret_jwt_key_2024
FRONTEND_URL=http://localhost:3000
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

## Seeded Test Credentials

| Role    | Username    | Password    |
|---------|-------------|-------------|
| Admin   | admin       | admin123    |
| Manager | manager     | manager123  |
| User    | demo_user   | user123     |

## Common Pitfalls

- **Export URL**: Use `exportReportExcel` (not `exportReport`) — the paths are different and only `exportReportExcel` matches the backend route.
- **Status normalization**: DB returns lowercase statuses; `STATUS_COLORS` keys are capitalized. Always run through `normalizeStatus()` before using as a Select value or chip color key.
- **Invoice type filtering**: Querying `/invoices` without `invoiceType` returns all types. Always specify the type.
- **`req.io`**: Socket.io is attached to the Express app as `app.set('io', io)` and accessed in routes via `req.app.get('io')` or `req.io` (the middleware adds it to `req`).
- **CORS**: The backend whitelists only `FRONTEND_URL`. If you change the frontend port, update `.env`.
