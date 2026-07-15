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

Maham is a personal task manager web app designed to be **simple, fast, and secure**. Users can register an account, log in, and manage their to-do list from a clean dark-mode dashboard. All data is stored in a local SQLite database. Authentication is handled via JWT stored in `httpOnly` cookies — meaning the token is never accessible to JavaScript, protecting against XSS-based token theft.

---

## Features

- 🔐 **Secure Authentication** — Register & log in with bcrypt-hashed passwords (12 rounds) and JWT sessions
- 🍪 **httpOnly Cookie Auth** — Tokens stored in `httpOnly + SameSite=Strict` cookies, not localStorage
- ✅ **Full Task CRUD** — Create, read, update (title + completion), and delete tasks
- 🛡️ **Rate Limiting** — Max 10 auth requests per 15-minute window (brute-force protection)
- 🔒 **Account Lockout** — 5 consecutive failed logins trigger a 15-minute lockout
- 🪖 **Security Headers** — `helmet` sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and more
- 🌐 **CORS Restriction** — Only configured origin can make API requests
- 🧪 **Test-Driven Development** — Jest + Supertest suite with 3 core API tests
- 🎨 **Dark-Mode UI** — Electric purple/cyan palette, glassmorphism, micro-animations

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Database** | sql.js (pure-JS SQLite — no native build tools needed) |
| **Auth** | bcryptjs (password hashing) + jsonwebtoken (JWT) |
| **Security** | helmet, express-rate-limit, cookie-parser, express-validator |
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
│   │   ├── auth.js               # POST /register, /login, /logout
│   │   └── tasks.js              # GET/POST/PUT/DELETE /api/tasks
│   ├── app.js                    # Express app (helmet, CORS, routes)
│   ├── server.js                 # HTTP server entry point
│   ├── tasks.test.js             # Jest + Supertest TDD suite
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

All task endpoints require authentication (cookie set on login, or `Authorization: Bearer <token>` header for testing).

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | `{ username, email, password }` | Create account, sets auth cookie |
| `POST` | `/api/auth/login` | `{ email, password }` | Log in, sets auth cookie |
| `POST` | `/api/auth/logout` | — | Clears auth cookie |

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
PASS ./tasks.test.js
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

See [SECURITY.md](./SECURITY.md) for the full vulnerability disclosure history.

### Summary of controls

| Control | Implementation |
|---|---|
| SQL Injection | Parameterized queries (`stmt.bind()`) on all DB calls |
| XSS (DOM) | All user content rendered via `.textContent` — never `innerHTML` |
| XSS (Token theft) | JWT in `httpOnly` cookie — JavaScript cannot read it |
| CSRF | `SameSite=Strict` cookie + Bearer token auth |
| Security Headers | `helmet` — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc. |
| Brute-force | Rate limiting (10 req/15min) + per-account lockout (5 attempts → 15min) |
| Password storage | `bcryptjs` with 12 rounds |
| Secrets | All via `.env` — never hardcoded, never committed |
| Data isolation | All task queries scoped by `user_id` — no IDOR vulnerabilities |
| Error responses | Generic messages to client — no stack traces or schema info exposed |

---

## Error & Bug Documentation

This section documents all bugs discovered during development, their root causes, and how they were resolved.

---

### BUG-001 — Registration crashed with `Cannot read properties of undefined (reading 'id')`

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Affected version** | v1.0.0 |
| **Fixed in** | v1.1.1 |
| **Affected file** | `backend/models/User.js` |

**Symptom:** Attempting to register a new account returned *"Registration failed. Please check your details."* The server log showed:
```
Register error: Cannot read properties of undefined (reading 'id')
```

**Root Cause:** The `createUser` function used a two-step pattern:
1. `db.run(INSERT ...)` — insert the user
2. `saveDb()` — export DB to disk via `db.export()`
3. `queryOne('SELECT last_insert_rowid()')` — get the new row's ID

The problem: `saveDb()` calls `db.export()` on the sql.js database object. This operation internally interacts with SQLite's virtual machine in a way that **resets** the `last_insert_rowid()` value, and may also **invalidate prepared statements** (which `queryOne` relies on via `stmt.bind()`). As a result, `createUser` received `null` as the ID, `findById(null)` returned `undefined`, and the route crashed trying to read `.id` from `undefined`.

**Fix:** Rewrote `createUser` to:
1. Run the INSERT
2. Immediately read the rowid using `db.exec('SELECT last_insert_rowid()')` — before `saveDb()`
3. Call `saveDb()`
4. Look up the new user by rowid using `db.exec()` (not a prepared statement) to avoid any post-export invalidation

```js
// Before (broken)
function createUser(username, email, passwordHash) {
  const id = execute('INSERT INTO users ...', [...]);
  return findById(id); // id was null because saveDb() reset last_insert_rowid
}

// After (fixed)
function createUser(username, email, passwordHash) {
  const db = getDb();
  db.run('INSERT INTO users ...', [...]);
  const rowidRes = db.exec('SELECT last_insert_rowid()'); // read BEFORE saveDb
  const rowid = rowidRes[0]?.values?.[0]?.[0];
  saveDb();
  const res = db.exec(`SELECT id, username, email, created_at FROM users WHERE id = ${rowid}`);
  return Object.fromEntries(res[0].columns.map((col, i) => [col, res[0].values[0][i]]));
}
```

---

### BUG-002 — Sign In / Sign Up buttons were unclickable

| Field | Detail |
|---|---|
| **Severity** | High (UI broken) |
| **Affected version** | v1.1.0 |
| **Fixed in** | v1.1.1 |
| **Affected files** | `frontend/index.html`, `frontend/app.js`, `backend/app.js` |

**Symptom:** After the security hardening patch (v1.1.0), the tab switcher buttons ("Log In" / "Sign Up") and the "Log Out" button stopped responding to clicks.

**Root Cause:** The security patch added `helmet` with a Content Security Policy (CSP) that included:
```js
scriptSrc: ["'self'"]
```

This correctly restricts scripts to same-origin files, but it also **blocks inline event handlers** such as:
```html
<button onclick="switchTab('login')">Log In</button>
```

Inline `onclick` attributes are treated as inline scripts by the browser's CSP enforcer. Without `'unsafe-inline'` in `scriptSrc`, these handlers were silently blocked, making the buttons appear clickable but do nothing.

**Fix:**
1. Removed all `onclick="..."` attributes from `index.html`
2. Wired the same functionality via `addEventListener` in `app.js` (inside the `init()` function):
```js
document.getElementById('tab-login').addEventListener('click', () => switchTab('login'));
document.getElementById('tab-register').addEventListener('click', () => switchTab('register'));
document.getElementById('logout-btn').addEventListener('click', () => logout());
```
3. Updated the CSP to add `crossOriginEmbedderPolicy: false` to allow Google Fonts to load without COEP conflicts.

---

### BUG-003 — Stale `todo.db` caused false "email already exists" errors

| Field | Detail |
|---|---|
| **Severity** | Medium (UX) |
| **Affected version** | v1.0.0 – v1.1.0 |
| **Fixed in** | v1.1.1 (operational fix) |
| **Affected file** | `backend/config/db.js` |

**Symptom:** After restarting the server, attempting to register with the same email used in a previous session returned a registration error, even on a "fresh" install.

**Root Cause:** sql.js persists the database to `todo.db` on disk after every write. On server restart, it loads this file back. If a user had registered in a previous session (even just during development/testing), their email was still in the DB. The anti-enumeration fix (returning a generic 400 instead of a 409) made this harder to diagnose since the error looked like a generic failure.

**Fix:** This is an operational issue, not a code bug. Resolution:
- Delete `backend/todo.db` to get a clean slate during development
- In production, this is expected behavior — accounts persist across restarts
- `todo.db` is already listed in `.gitignore` so it is never committed

---

### BUG-004 — Native module compilation failures on Windows (historical)

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
| `v1.1.1` | 2026-07-15 | Fix registration crash (BUG-001), fix unclickable buttons (BUG-002) |
| `v1.1.0` | 2026-07-15 | Security hardening: helmet, rate limiting, account lockout, httpOnly cookies, CORS restriction |
| `v1.0.0` | 2026-07-15 | Initial release: full-stack app, auth, task CRUD, dark-mode UI, TDD suite |

---

## License

This is a personal project. All rights reserved.
