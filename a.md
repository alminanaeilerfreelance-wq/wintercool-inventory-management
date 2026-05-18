# Wintercool Inventory Management Application

## Overview

Wintercool Inventory Management is a full-stack Warehouse Management System (WMS) designed for inventory, supply chain, and warehouse operations.  
It provides centralized control over products, stock movement, invoicing, payroll/HR-related records, reporting, and system administration.

The platform is built with:

- **Frontend:** Next.js 14 (React) + Material-UI  
- **Backend:** Node.js + Express.js  
- **Database:** MongoDB with Mongoose  
- **Real-time updates:** Socket.io  
- **Authentication:** JWT-based, with role-based authorization  

---

## Core Features

- Inventory and stock management
- Product master data management (brands, categories, units, types, etc.)
- Warehouse/store branch/location/rack/bin management
- Purchase orders, transfers, and returns
- Invoice management (customer/service/sub-dealer flows)
- Payment and expense tracking
- Attendance, payroll, designations, departments
- Dashboard metrics and operational reports
- Real-time notifications/events through Socket.io
- Audit logs and security alerting
- Role-based access controls and admin-protected operations

---

## Project Structure

```text
.
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── utils/
│   ├── seed.js
│   └── server.js
├── frontend/
│   ├── components/
│   ├── context/
│   ├── pages/
│   ├── public/
│   ├── theme/
│   └── utils/
├── package.json
└── ...
```

### Backend highlights

- `backend/server.js`: Express app bootstrap, middleware, route mounting, Socket.io setup
- `backend/routes/`: API modules (auth, users, inventory, invoices, reports, etc.)
- `backend/models/`: Mongoose schemas for domain entities
- `backend/middleware/`: auth, permissions, security, audit, upload, admin password checks
- `backend/config/db.js`: MongoDB connection
- `backend/scripts/initialize-system.js`: system initialization logic
- `backend/seed.js`: seed data loader

### Frontend highlights

- `frontend/pages/`: Next.js route pages (dashboard, inventory, invoices, settings, reports, etc.)
- `frontend/components/`: shared and domain-specific UI components
- `frontend/context/`: authentication, permissions, and settings context providers
- `frontend/utils/`: API helper modules and utilities
- `frontend/theme/`: app theming

---

## Prerequisites

- Node.js (recommended modern LTS)
- npm
- MongoDB instance (Atlas or local)

---

## Installation

From project root:

```bash
npm run install-all
```

This installs dependencies for:
- root package
- backend package
- frontend package

---

## Environment Configuration

### Backend (`backend/.env`)

Set at least:

```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=dashboard_db
JWT_SECRET=your_secure_secret
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Optional (if used by your workflows):

```env
GOOGLE_CLIENT_ID=...
EMAIL_HOST=...
EMAIL_PORT=...
EMAIL_USER=...
EMAIL_PASS=...
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

---

## Running the Application

### Run both backend and frontend (recommended for development)

```bash
npm run dev
```

Expected default ports:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5001`

### Run services separately

```bash
npm run backend
npm run frontend
```

### Production-oriented commands

```bash
npm start
npm run start --prefix backend
npm run build --prefix frontend
npm start --prefix frontend
```

---

## Database Initialization & Seed

Initialize and seed data:

```bash
npm run init
npm run seed
```

Seeded sample users typically include:

- `admin / admin123`
- `manager / manager123`
- `demo_user / user123`

Use these only for local/testing environments and replace credentials in production.

---

## Authentication and Authorization

### JWT Flow

1. User logs in from frontend
2. Backend validates credentials and returns JWT
3. Frontend stores token (typically in `localStorage`)
4. Token is sent as `Authorization: Bearer <token>` on API requests
5. Backend `protect` middleware validates token and attaches user context

### Access Rules

- Most API routes require JWT
- `adminOnly` middleware gates admin operations
- DELETE operations may require extra admin password confirmation (`adminPasswordAuth`)
- Roles are typically: `admin`, `manager`, `user`

---

## Real-Time (Socket.io)

The backend provides event-based updates (notifications and activity updates), with support for room-based targeting such as:

- user-specific rooms (`user_<id>`)
- admin room (`admin_room`)

This enables selective broadcast instead of global event noise.

---

## Security Measures

Implemented security patterns include:

- Helmet headers
- Rate limiting
- Mongo sanitize
- XSS and HTTP parameter pollution mitigation
- bcrypt password hashing
- Audit log/security alert tracking
- Role and permission middleware enforcement

---

## Common Development Workflow

1. Configure env files (`backend/.env`, `frontend/.env.local`)
2. Install dependencies (`npm run install-all`)
3. Initialize system and seed (`npm run init`, `npm run seed`)
4. Start app (`npm run dev`)
5. Login via `/login` and validate dashboards/modules

---

## Troubleshooting

### Port conflicts

```bash
npm run kill-ports
```

### MongoDB connection errors

- Verify `MONGODB_URI`
- Check DB network access/whitelisting
- Confirm DB name (`MONGODB_DB`)

### JWT/auth issues

- Ensure token is being sent in Authorization header
- Re-login if token expired

### CORS issues

- Ensure backend `FRONTEND_URL` matches frontend origin
- Verify backend security/CORS middleware configuration

### Socket.io not updating

- Confirm socket connection in browser console
- Ensure backend and frontend origins are allowed
- Verify emits are sent to the intended room(s)

---

## Notes

- Route files in backend are domain-specific and modular (`backend/routes/*`)
- Models are maintained in `backend/models/*`
- UI pages are route-driven via Next.js in `frontend/pages/*`

This documentation is intended as a practical quickstart + architecture reference for contributors and operators.
