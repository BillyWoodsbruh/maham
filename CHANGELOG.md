# Changelog

All notable changes to this project are documented here.
Format: `[version] — date — description`

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

### CLI
- `cli.js` — Terminal interface: `register`, `login`, `logout`, `list`, `add`, `done`, `undone`, `delete`

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
