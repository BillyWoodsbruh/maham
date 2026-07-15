# Changelog

All notable changes to this project are documented here.
Format: `[version] — date — description`

---

## [1.2.0] — 2026-07-15 — Security Hardening

Full details, verification steps, and rationale for each fix are in [SECURITY.md](./SECURITY.md).

### Added
- `helmet` — sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and other security headers
- `express-rate-limit` — caps `/api/auth/register` and `/api/auth/login` to 10 requests / 15 min per IP
- `cookie-parser` + httpOnly cookie auth — the JWT is now set as an `httpOnly` + `SameSite=Strict` cookie instead of being stored in `localStorage`
- Per-account lockout — 5 consecutive failed logins lock the account for 15 minutes (`failed_attempts` / `locked_until` columns on `users`, with a migration for existing databases)
- `GET /api/auth/me` and `POST /api/auth/logout` endpoints
- Server-side max-length validation on task titles (200 chars) and usernames (2–50 chars, restricted character set)
- Stronger password policy: minimum 8 characters, must contain at least one digit

### Changed
- CORS restricted to `ALLOWED_ORIGIN` (from `.env`) instead of allowing any origin; `credentials: true` enabled for the auth cookie
- JWT lifetime shortened from 7 days to 1 day
- Registration with a duplicate email now returns a generic error instead of confirming the account exists (prevents enumeration)
- `frontend/index.html` / `frontend/app.js` — removed inline `onclick` handlers (required by the new CSP) in favor of `addEventListener`; removed all `localStorage` token usage

### Fixed
- **BUG-001** — Registration and task creation crashed with `Cannot read properties of undefined (reading 'id')` when run against the real on-disk database. `saveDb()` (via sql.js's `db.export()`) was resetting `last_insert_rowid()` before it was read. Fixed by reading the rowid before calling `saveDb()` in both `models/User.js` and `models/Task.js`.

---

## [1.0.0] — 2026-07-15 — Initial Release

### Added
- **Project scaffold** — `frontend/` and `backend/` subfolder structure
- **PRD** (`PRD.md`) — Product Requirements Document outlining features and UX flow
- **AGENTS.md** — Security and architecture rules for all AI agents

### Backend
- `backend/app.js` — Express.js application (exported for Supertest)
- `backend/server.js` — HTTP server entry point with async DB initialization
- `backend/config/db.js` — `sql.js` (pure-JS SQLite) database with in-memory mode for tests
- `backend/models/User.js` — User CRUD: `createUser`, `findByEmail`, `findById`
- `backend/models/Task.js` — Task CRUD: `createTask`, `getTasksByUser`, `updateTask`, `deleteTask`
- `backend/middleware/authMiddleware.js` — JWT Bearer token verification middleware
- `backend/routes/auth.js` — `POST /api/auth/register` and `POST /api/auth/login`
- `backend/routes/tasks.js` — `GET/POST/PUT/DELETE /api/tasks` (all JWT-protected)
- `backend/package.json` — Dependencies: `express`, `sql.js`, `bcryptjs`, `jsonwebtoken`, `dotenv`, `express-validator`, `cors`
- `backend/.env.example` — Safe environment variable template

### Frontend
- `frontend/index.html` — Single-page app with Auth and Dashboard screens
- `frontend/style.css` — Dark-mode UI, electric purple + cyan palette, glassmorphism, micro-animations
- `frontend/app.js` — Auth flow, JWT session management, full task CRUD with inline editing
### Tests (TDD)
- `backend/tasks.test.js` — Jest + Supertest suite covering:
  - ✅ `POST /api/tasks` with valid JWT → 201
  - ✅ `POST /api/tasks` without JWT → 401
  - ✅ `POST /api/tasks` with missing title → 400

### Security
- Passwords hashed with `bcryptjs` (12 rounds)
- JWT signed with `JWT_SECRET` from environment (never hardcoded)
- Input validation via `express-validator` on all endpoints
- `.env` and `*.db` files gitignored
- Generic error messages — no internal details exposed to clients

---
