# ✦ Maham — To-Do List Manager

> A lightweight, secure, full-stack to-do list manager with authentication, built with Node.js, Express, and Vanilla JS.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Running Tests](#running-tests)
- [Security](#security)
- [Error & Bug Documentation](#error--bug-documentation)
- [Changelog](#changelog)

---

## Overview

Maham is a personal task manager web app designed to be **simple, fast, and secure**. Users can register an account, log in, and manage their to-do list from a clean dark-mode dashboard. All data is stored in a local SQLite database. Authentication is handled via JWT stored in an `httpOnly` + `SameSite=Strict` cookie — the token is never accessible to JavaScript, protecting against XSS-based token theft.

---

## Features

- 🔐 **Secure Authentication** — Register & log in with bcrypt-hashed passwords (12 rounds) and JWT sessions
- 🍪 **httpOnly Cookie Auth** — Tokens stored in `httpOnly + SameSite=Strict` cookies, never in `localStorage`
- ✅ **Full Task CRUD** — Create, read, update (title + completion), and delete tasks
- 🛡️ **Rate Limiting** — Max 10 auth requests per 15-minute window (brute-force protection)
- 🔒 **Account Lockout** — 5 consecutive failed logins trigger a 15-minute lockout
- 🪖 **Security Headers** — `helmet` sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and more
- 🌐 **CORS Restriction** — Only the configured `ALLOWED_ORIGIN` may call the API
- 🧪 **Test-Driven Development** — Jest + Supertest suite covering core API behavior
- 🎨 **Dark-Mode UI** — Electric purple/cyan palette, glassmorphism, micro-animations

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Database** | sql.js (pure-JS SQLite — no native build tools needed) |
| **Auth** | bcryptjs (password hashing) + jsonwebtoken (JWT) |
| **Security** | helmet, express-rate-limit, cookie-parser, express-validator, cors |
| **Frontend** | Vanilla HTML / CSS / JavaScript (no framework) |
| **Testing** | Jest + Supertest |
| **Font** | Outfit (Google Fonts) |

---

## Project Structure

```
daicotestlab2/
├── backend/
│   ├── config/
│   │   └── db.js                 # sql.js DB initialization + migrations
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT verification (cookie + Bearer fallback)
│   ├── models/
│   │   ├── User.js               # User CRUD + account lockout helpers
│   │   └── Task.js               # Task CRUD (owner-scoped)
│   ├── routes/
│   │   ├── auth.js               # POST /register, /login, /logout, GET /me
│   │   └── tasks.js              # GET/POST/PUT/DELETE /api/tasks
│   ├── app.js                    # Express app (helmet, CORS, cookies, routes)
│   ├── server.js                 # HTTP server entry point
│   ├── TDD.test.js               # Jest + Supertest TDD suite
│   ├── .env                      # Local secrets (gitignored)
│   ├── .env.example              # Safe env template
│   └── package.json
├── frontend/
│   ├── index.html                # SPA shell (auth + dashboard screens)
│   ├── style.css                 # Dark-mode design system
│   └── app.js                    # Auth flow, task CRUD, cookie-based session
├── AGENTS.md                     # AI agent security & architecture rules
├── CHANGELOG.md                  # Version history
├── SECURITY.md                   # Vulnerability disclosure history
├── PRD.md                        # Product Requirements Document
└── README.md                     # This file
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)
- No C++ build tools required — `sql.js` is pure JavaScript

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/BillyWoodsbruh/maham.git
cd maham

# 2. Install backend dependencies
cd backend
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and set a strong JWT_SECRET
```

### Running the App

```bash
# From the backend/ directory:
node server.js
```

Open **http://localhost:3000** in your browser.

> **Windows users:** If npm scripts are blocked, run this first:
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
> ```

### First Use

1. Go to `http://localhost:3000`
2. Click **Sign Up** and create an account
   - Username: 2–50 characters, alphanumeric + spaces/underscores/dashes
   - Password: minimum 8 characters
3. You'll land on your dashboard automatically
4. Add tasks, check them off, edit or delete them

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `JWT_SECRET` | *(required)* | Long random string for JWT signing — **change this!** |
| `NODE_ENV` | `development` | Set to `production` for production deployments |
| `ALLOWED_ORIGIN` | `http://localhost:3000` | CORS allowed origin |

> ⚠️ Never commit your `.env` file. It is already in `.gitignore`.

---

## API Reference

All task endpoints require authentication (httpOnly cookie set on login/register, or an `Authorization: Bearer <token>` header for API clients/testing).

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | `{ username, email, password }` | Create account, sets auth cookie |
| `POST` | `/api/auth/login` | `{ email, password }` | Log in, sets auth cookie |
| `POST` | `/api/auth/logout` | — | Clears the auth cookie |
| `GET` | `/api/auth/me` | — | Returns the current user, if authenticated |

### Tasks

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `GET` | `/api/tasks` | — | Get all tasks for the logged-in user |
| `POST` | `/api/tasks` | `{ title }` | Create a new task |
| `PUT` | `/api/tasks/:id` | `{ title?, completed? }` | Update a task (owner only) |
| `DELETE` | `/api/tasks/:id` | — | Delete a task (owner only) |

### Response Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Validation error |
| `401` | Unauthorized (no/invalid token) |
| `404` | Resource not found |
| `429` | Too many requests / account locked |
| `500` | Internal server error |

---

## Running Tests

```bash
cd backend
npm test
```

Expected output:
```
PASS ./TDD.test.js
  Task API - Core Functionality Tests
    POST /api/tasks
      ✓ should create a new task successfully when authenticated
      ✓ should return 401 Unauthorized if no authentication token is provided
      ✓ should return 400 Bad Request if the task title is missing

Tests: 3 passed, 3 total
```

Tests use an **in-memory database** (isolated per run, never touches `todo.db`).

---

## Security

See [SECURITY.md](./SECURITY.md) for the full vulnerability disclosure history — what was found, how it was fixed, and how each fix was verified.

### Summary of controls

| Control | Implementation |
|---|---|
| SQL Injection | Parameterized queries (`stmt.bind()`) on all DB calls |
| XSS (DOM) | All user content rendered via `.textContent` — never `innerHTML` |
| XSS (Token theft) | JWT in `httpOnly` cookie — JavaScript cannot read it |
| CSRF | `SameSite=Strict` cookie + restricted CORS origin |
| Security Headers | `helmet` — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc. |
| Brute-force | Rate limiting (10 req/15min) + per-account lockout (5 attempts → 15min) |
| Account enumeration | Generic error messages on both login and registration |
| Password storage | `bcryptjs` with 12 rounds |
| Secrets | All via `.env` — never hardcoded, never committed |
| Data isolation | All task queries scoped by `user_id` — no IDOR vulnerabilities |
| Error responses | Generic messages to client — no stack traces or schema info exposed |

Known accepted tradeoff: JWTs are valid for 1 day with no server-side revocation list, so a token exfiltrated before logout remains usable until it expires. See [SECURITY.md → VULN-007](./SECURITY.md#vuln-007) for the rationale.

---

## Error & Bug Documentation

This section documents all bugs discovered during development, their root causes, and how they were resolved.

---

### BUG-001 — Registration and task creation crashed with `Cannot read properties of undefined (reading 'id')`

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Affected version** | v1.0.0 – v1.1.1 |
| **Fixed in** | v1.2.0 |
| **Affected files** | `backend/models/User.js`, `backend/models/Task.js` |

**Symptom:** Running the app against the real on-disk database (i.e. outside of Jest, where `NODE_ENV=test`) caused registration and task creation to fail with a `500` error. The server log showed:
```
Register error: Cannot read properties of undefined (reading 'id')
```
This wasn't caught earlier because the Jest suite runs against an in-memory database where `saveDb()` is a no-op — the bug only appeared in real (non-test) usage.

**Root Cause:** The shared `execute()` helper in both models ran the write, then called `saveDb()` (which calls sql.js's `db.export()`), and only *after that* read `last_insert_rowid()`:
```js
function execute(sql, params = []) {
  const db = getDb();
  db.run(sql, params);
  saveDb();                                              // exports/resets the connection
  const result = queryOne('SELECT last_insert_rowid() as id'); // now returns null
  return result ? result.id : null;
}
```
`db.export()` resets rowid tracking on the sql.js connection, so the ID read afterward was always `null`, and the calling code (`findById(null)`) returned `undefined`.

**Fix:** Reordered both `execute()` implementations to read the rowid *before* calling `saveDb()`:
```js
function execute(sql, params = []) {
  const db = getDb();
  db.run(sql, params);
  const result = queryOne('SELECT last_insert_rowid() as id'); // read BEFORE saveDb()
  saveDb();
  return result ? result.id : null;
}
```

---

### BUG-002 — Stale `todo.db` caused false "email already exists" errors

| Field | Detail |
|---|---|
| **Severity** | Medium (UX) |
| **Affected version** | v1.0.0 |
| **Fixed in** | v1.1.1 (operational fix) |
| **Affected file** | `backend/config/db.js` |

**Symptom:** After restarting the server, attempting to register with the same email used in a previous session returned a registration error, even on a "fresh" install.

**Root Cause:** sql.js persists the database to `todo.db` on disk after every write. On server restart, it loads this file back. If a user had registered in a previous session (even just during development/testing), their email was still in the DB. The anti-enumeration fix (returning a generic 400 instead of a 409) made this harder to diagnose since the error looked like a generic failure.

**Fix:** This is an operational issue, not a code bug. Resolution:
- Delete `backend/todo.db` to get a clean slate during development
- In production, this is expected behavior — accounts persist across restarts
- `todo.db` is already listed in `.gitignore` so it is never committed

---

### BUG-003 — Native module compilation failures on Windows (historical)

| Field | Detail |
|---|---|
| **Severity** | Critical (build failure) |
| **Affected version** | v0.x (pre-release) |
| **Fixed in** | v1.0.0 |
| **Affected files** | `backend/package.json` |

**Symptom:** Running `npm install` failed with errors about missing C++ build tools, `node-gyp`, or Visual Studio on Windows.

**Root Cause:** The initial implementation used `better-sqlite3` (native SQLite bindings) and `bcrypt` (native C++ crypto). Both require compilation via `node-gyp` and a C++ toolchain. On Windows without Visual Studio Build Tools installed, these fail to compile.

**Fix:** Swapped both native packages for pure-JavaScript equivalents:
- `better-sqlite3` → `sql.js` (Emscripten-compiled SQLite WASM — no native build needed)
- `bcrypt` → `bcryptjs` (pure JS implementation, identical API)

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

| Version | Date | Summary |
|---|---|---|
| `v1.2.0` | 2026-07-15 | Security hardening: httpOnly cookies, rate limiting, account lockout, helmet, CORS restriction, stronger validation (see [SECURITY.md](./SECURITY.md)); fixed registration/task-creation crash (BUG-001) |
| `v1.0.0` | 2026-07-15 | Initial release: full-stack app, auth, task CRUD, dark-mode UI, TDD suite |

---

## License

This is a personal project. All rights reserved.
