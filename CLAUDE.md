# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CityDrive** — a full-stack carsharing web application. Monorepo with separate `backend/` and `frontend/` directories (no root package.json).

- **Backend**: Express 4 + PostgreSQL + JWT auth on port 3001
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS on port 3000
- **Database**: PostgreSQL 16 with PostGIS extension, 20+ tables

## Commands

### Local development

```bash
# Backend (requires PostgreSQL on localhost:5431, database: avtorend)
cd backend && npm install && npm run dev   # nodemon, auto-reload

# Frontend
cd frontend && npm install && npm run dev  # http://localhost:3000

# Run migrations (backend must have .env configured)
cd backend && npm run migrate
```

### Docker (all-in-one)

```bash
docker-compose up --build   # starts db + backend + frontend
docker-compose down -v      # stop + remove volumes
```

### Frontend build

```bash
cd frontend && npm run build && npm start
```

## Architecture

### Backend (`backend/src/`)

```
src/
  server.js          # Express app, middleware, route mounting
  config/
    db.js            # pg Pool (reads DB_HOST/PORT/NAME/USER/PASSWORD from .env)
    upload.js        # multer config (uploads to ./uploads/)
  middleware/
    auth.js          # JWT Bearer token → req.user
    roles.js         # role-based access guard
  routes/
    auth.js          # POST /api/auth/register|login|employee/login
    users.js         # profile, documents upload, balance, verification
    admin.js         # stats, revenue chart, audit logs, receipts
    cars.js          # car listing with filters, car detail, status update
    bookings.js      # create/activate/cancel/complete booking, deposits
    fines.js         # fine assign/pay, fiscal receipts
    employees.js     # employee CRUD
    driver.js        # delivery tasks, pickups, parking queue
    tariffs.js       # pricing tier CRUD
```

All routes mounted at `/api/*`. Static files served from `/uploads` at `/uploads/*`.

### Frontend (`frontend/src/`)

```
app/
  page.js             # Landing page (auth redirect: employees → /admin/dashboard, users → /profile)
  layout.js           # Root layout, global fonts
  login/              # User login (phone + password)
  register/           # New user registration
  profile/            # User profile, documents, balance
  cars/               # Car listing + booking modal
  cars/[id]/          # Car detail page
  bookings/           # User's active/past bookings
  fines/              # User's fines
  receipts/           # Fiscal receipts
  verification/       # Document upload flow
  admin/
    layout.js         # Admin sidebar with mobile hamburger drawer
    dashboard/        # Stats, SVG area chart, donut chart
    users/bookings/cars/employees/fines/tariffs/verification/audit/receipts/
lib/
  api.js              # All API calls (authAPI, carsAPI, bookingsAPI, etc.)
components/
  UserHeader.js       # Top nav for user-facing pages with mobile dropdown
  FiscalReceiptModal.js
```

### Authentication flow

- Users: phone + password → `/api/auth/login` → JWT stored in `localStorage.token`
- Employees: email + password → `/api/auth/employee/login` → JWT stored in `localStorage.token`
- User object stored in `localStorage.user` as JSON; `user.table` = `'users'` or `'employees'`
- All protected API calls: `Authorization: Bearer <token>` header
- Role check: `user.table === 'employees'` → admin routes; else → user routes

### Database

- Connection: pg Pool from `backend/src/config/db.js`, reads `DB_*` env vars
- Migrations: `node-pg-migrate` with config in `backend/database.json`, migration files in `backend/migrations/`
- PostGIS used for parking lot GPS coordinates
- Key tables: `users`, `employees`, `cars`, `bookings`, `fines`, `parking_lots`, `tariffs`, `documents`, `audit_logs`, `receipts`

## Environment Variables

**Backend** (`backend/.env`):
```
PORT=3001
DB_HOST=localhost
DB_PORT=5431
DB_NAME=avtorend
DB_USER=postgres
DB_PASSWORD=1234
JWT_SECRET=...
JWT_EXPIRES_IN=7d
UPLOAD_PATH=./uploads
```

**Frontend** (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```
Note: `NEXT_PUBLIC_API_URL` is embedded at **build time** — changing it after build requires a rebuild.

## UI System

Dark theme throughout. Custom CSS classes defined in `frontend/src/app/globals.css`:
- `btn-primary` — indigo gradient button
- `btn-secondary` — dark outlined button
- `btn-danger` — red gradient button
- `input-field` — dark styled input
- `card`, `card-glass` — dark surface containers
- Status badges: `badge-reserved`, `badge-active`, `badge-completed`, `badge-cancelled`, `badge-pending`, `badge-verified`, `badge-available`, `badge-in_use`, `badge-maintenance`

Custom Tailwind tokens in `tailwind.config.js`: `dark-bg`, `dark-surface`, `dark-card`, `dark-border`, `dark-hover` colors + `animate-fade-in`, `animate-slide-up`, `animate-spin-slow`, `animate-glow-pulse`.

## Known Local Credentials

- **Admin**: `owner@citydrive.ru` / `123456` at `/admin/login`
- **Client**: `+77027955131` / `123456` at `/login`
- Passwords use bcryptjs 10 rounds
