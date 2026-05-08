# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Warehouse Management System (WMS) — a full-stack platform for inventory, supply chain, and warehouse operations. The project uses:
- **Frontend**: Next.js 14 (React) with Material-UI
- **Backend**: Express.js with Node.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.io for live updates
- **Authentication**: JWT-based with role-based access control

## Development Commands

### Initial Setup
```bash
npm run install-all           # Install all dependencies (root + backend + frontend)
npm run init                  # Initialize backend system (set up initial data)
npm run seed                  # Seed database with sample data
```

### Development Servers
```bash
npm run dev                   # Run both backend (port 5001) and frontend (port 3000) concurrently
npm run backend               # Run only backend server with nodemon
npm run frontend              # Run only frontend server (Next.js dev)
```

### Production
```bash
npm start                     # Run both servers in production mode
npm run start --prefix backend    # Backend production
npm run build --prefix frontend   # Frontend build
npm start --prefix frontend       # Frontend production
```

### Database
```bash
npm run seed                  # Populate MongoDB with seeded data (users, products, invoices, etc.)
npm run init                  # Run backend initialization script
```

### Troubleshooting
```bash
npm run kill-ports            # Kill processes on ports 3000 and 5001 (useful if servers don't stop cleanly)
```

## Architecture

### Backend Structure (`/backend`)
- **`server.js`**: Main Express app with Socket.io setup, security middleware, CORS, and route imports
- **`routes/`**: 30+ API route files organized by domain (auth, users, inventory, invoices, etc.)
  - Each route file has CRUD endpoints and applies middleware (auth, admin, validation)
- **`models/`**: 40+ Mongoose schemas for entities (User, Product, Inventory, Invoice, etc.)
- **`middleware/`**:
  - `auth.js`: `protect` (JWT verify), `adminOnly` (role check), `adminPasswordAuth` (admin password confirmation for DELETE operations)
  - `security.js`: Helmet, rate limiting, mongo-sanitize, XSS protection, HPP
  - `permissions.js`: Fine-grained permission checks
  - `audit.js`: Audit log middleware
- **`config/db.js`**: MongoDB connection
- **`scripts/`**: Initialization and utility scripts
- **`utils/`**: Email, file upload handlers
- **`seed.js`**: Database seeding script

### Frontend Structure (`/frontend`)
- **`pages/`**: Next.js pages (index, login, signup, dashboard, inventory, invoices, settings, etc.)
- **`components/`**: Reusable React components (Navbar, Sidebar, Charts, Forms, Tables)
- **`context/`**:
  - `AuthContext.js`: User auth state, login/logout, JWT token management
  - `PermissionsContext.js`: Role-based permission state
  - `SettingsContext.js`: App settings and preferences
- **`utils/`**: API client (axios setup), helper functions
- **`theme/`**: Material-UI theme configuration
- **`public/`**: Static assets, manifest.json for PWA

## Authentication & Authorization

### JWT Flow
1. User submits credentials at `/login`
2. Backend verifies credentials, generates JWT (7-day expiry)
3. Frontend stores JWT in `localStorage` under key (typically `token`)
4. All requests include JWT in `Authorization: Bearer <token>` header
5. `protect` middleware validates JWT and attaches `req.user` with user data

### Authorization Rules
- **All API routes require JWT** (except `/api/auth/login`, `/api/auth/signup`)
- **Admin-only routes**: Use `adminOnly` middleware
- **DELETE operations**: Require additional `adminPasswordAuth` middleware (admin must provide admin password)
- **CREATE/UPDATE operations**: Require only JWT (no admin password needed)
- **Roles**: `admin`, `manager`, `user` (role-based access)

### User Roles in Routes
- Routes often check `req.user.role` and apply additional `adminOnly` middleware
- Some routes have custom permission logic in `permissions.js`

## Key Environment Variables

### Backend (`.env`)
- `PORT=5001` — API server port
- `MONGODB_URI` — MongoDB connection string
- `MONGODB_DB=dashboard_db` — Database name
- `JWT_SECRET=wms_super_secret_jwt_key_2024` — Secret for signing tokens
- `NODE_ENV=development|production`
- `GOOGLE_CLIENT_ID` — For Google OAuth (if used)
- `FRONTEND_URL=http://localhost:3000` — CORS origin
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` — Email config for notifications

### Frontend (`.env.local`)
- `NEXT_PUBLIC_API_URL=http://localhost:5001/api` — Backend API URL (must be prefixed with `NEXT_PUBLIC_`)

## Socket.io Real-Time Updates

Backend implements Socket.io for real-time notifications:
- Clients join user-specific rooms: `socket.join('user_${userId}')`
- Admin can join admin room: `socket.join('admin_room')`
- Routes emit events via `req.io.to('user_${userId}').emit(event, data)`
- Frontend connects via `io('http://localhost:5001')` in pages/components

## Common Development Patterns

### Adding a New API Route
1. Create `backend/routes/[feature].js` with Express router
2. Apply `protect` middleware to all endpoints (and `adminOnly` if needed)
3. Define Mongoose schema in `backend/models/`
4. Import route in `backend/server.js` under `app.use('/api/[feature]', require(...))`
5. Test with JWT token in Authorization header

### Adding Frontend Pages
1. Create page in `frontend/pages/[feature].js`
2. Use `useRouter()` and `useEffect()` to check auth (redirect to login if not authenticated)
3. Fetch data via axios using `AuthContext` token
4. Use Material-UI components and theme for consistent UI
5. Wrap forms/tables with validation and error handling

### Database Queries
- Use Mongoose methods: `find()`, `findById()`, `findByIdAndUpdate()`, `deleteOne()`, etc.
- Always select/exclude sensitive fields (e.g., `select('-password')` for User)
- Populate related documents with `.populate()` when needed
- Use pagination in list endpoints: `skip((page - 1) * limit).limit(limit)`

## Security Practices

- **Helmet**: Sets security headers (HSTS, CSP, X-Frame-Options, etc.)
- **Rate Limiting**: Applied globally to prevent brute force
- **Mongo Sanitize**: Strips $ and . from user input to prevent NoSQL injection
- **XSS Protection**: Input validation and output encoding
- **HPP**: HTTP Parameter Pollution protection
- **Password Hashing**: bcryptjs for user password storage
- **Audit Logging**: SecurityAlert and AuditLog models track suspicious activity
- **Admin Password**: DELETE operations require admin password confirmation (separate from JWT)

## Seeded Test Data

Database comes pre-populated with:
- **Users**: admin (admin123), manager (manager123), demo_user (user123)
- **15 products**, **2 warehouses**, **3 store branches**, **7 customers**, **6 suppliers**
- **15 inventory items**, **16 invoices**, **6 purchase orders**, **7 calendar events**

Use these credentials for testing. Admin account has full access; manager and user accounts have restricted permissions.

## Debugging & Common Issues

### Port Conflicts
```bash
npm run kill-ports             # Kill processes on 3000 and 5001
```

### MongoDB Connection Fails
- Check `MONGODB_URI` in `.env`
- Verify network access to MongoDB Atlas (if using cloud DB)
- Check database name matches `MONGODB_DB`

### JWT Expired
- Frontend automatically redirects to login when token expires (7 days)
- User must re-authenticate to get new token

### CORS Errors
- Ensure `FRONTEND_URL` in backend `.env` matches frontend origin
- Frontend URL should be `http://localhost:3000` for development

### Socket.io Not Working
- Check socket connection is established in browser console
- Verify CORS settings in `server.js` allow frontend origin
- Emit events use `req.io` or `app.get('io')`

## File Naming & Code Style

- **Routes**: Plural names in `/routes` (e.g., `products.js`, `invoices.js`)
- **Models**: Singular, PascalCase (e.g., `User.js`, `Inventory.js`)
- **Middleware**: Descriptive names (e.g., `auth.js`, `security.js`)
- **Frontend components**: PascalCase (e.g., `Navbar.js`, `ProductTable.js`)
- **Imports**: Use relative paths in components, absolute paths for modules

## Testing Login Workflow

1. Start both servers: `npm run dev`
2. Navigate to `http://localhost:3000/login`
3. Enter credentials: `admin` / `admin123`
4. Dashboard loads with user-specific data and charts
5. Token stored in `localStorage` as `token`
6. Logout clears token and redirects to login

## Performance & Optimization

- **Frontend**: Next.js automatically splits code by route; use `next/dynamic` for heavy components
- **Backend**: Pagination on list endpoints; indexing on frequently queried fields
- **Database**: MongoDB indexes on `_id` (automatic), add indexes for search/filter fields
- **Socket.io**: Only emit to specific rooms/users, avoid broadcasting to all connections
- **PWA**: Service worker configured (disabled in dev); caches Google Fonts and static assets
