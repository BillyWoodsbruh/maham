# Security Log

This document records the security review findings for Maham, the vulnerabilities identified, and exactly what was changed to fix each one. It is kept up to date whenever a security issue is found and resolved, and is linked from `README.md`.

**Last reviewed:** 2026-07-15 · **Fixed in:** `v1.2.0`

---

## Summary

| # | Severity | Issue | Status |
|---|---|---|---|
| [VULN-001](#vuln-001) | High | JWT stored in `localStorage`, readable by any JS on the page | ✅ Fixed |
| [VULN-002](#vuln-002) | High | No rate limiting on auth endpoints | ✅ Fixed |
| [VULN-003](#vuln-003) | High | No account lockout after repeated failed logins | ✅ Fixed |
| [VULN-004](#vuln-004) | High | No security headers (`helmet` not installed) | ✅ Fixed |
| [VULN-005](#vuln-005) | Medium | Account/email enumeration on registration | ✅ Fixed |
| [VULN-006](#vuln-006) | Medium | Overly permissive CORS (`cors()` with no origin restriction) | ✅ Fixed |
| [VULN-007](#vuln-007) | Medium | No token revocation — JWT valid 7 days after "logout" | ✅ Mitigated |
| [VULN-008](#vuln-008) | Low | No server-side max-length validation on task title / username | ✅ Fixed |
| [VULN-009](#vuln-009) | Low | Weak password policy (6-char minimum, no complexity) | ✅ Fixed |
| [BUG-005](#bug-005) | Critical (functional) | Registration crashed in non-test mode (`last_insert_rowid` reset) | ✅ Fixed |

---

## VULN-001

**Severity:** High
**Issue:** The JWT was returned in the JSON response body and stored in `localStorage` (`frontend/app.js`). Any JavaScript running on the page — including code injected via a future XSS bug — could read `localStorage.getItem('maham_token')` and steal the session.

**Fix:**
- `backend/routes/auth.js` — added `issueSession()`, which signs the JWT and sets it via `res.cookie('token', ..., { httpOnly: true, sameSite: 'strict', secure: NODE_ENV === 'production' })` on register/login.
- `backend/middleware/authMiddleware.js` — now reads the token from `req.cookies.token` first (Bearer header kept only as a fallback for API clients/tests).
- `backend/app.js` — added `cookie-parser` middleware to parse the cookie.
- `frontend/app.js` — removed `getToken`/`setToken` and all `localStorage` token usage. `apiFetch()` now sends `credentials: 'include'` so the browser attaches the httpOnly cookie automatically; the token itself is never touched by frontend JS.
- Added `GET /api/auth/me` so the frontend can check "am I logged in?" on page load without ever holding the token client-side.

**Verified:** Registered a user and confirmed the `Set-Cookie` header includes `HttpOnly; SameSite=Strict`; confirmed `/api/tasks` and `/api/auth/me` succeed using only the cookie (no `Authorization` header); confirmed `document.cookie` cannot access it (httpOnly).

---

## VULN-002

**Severity:** High
**Issue:** `/api/auth/login` and `/api/auth/register` had no request throttling, allowing unlimited brute-force / credential-stuffing attempts.

**Fix:** Added `express-rate-limit` (`backend/routes/auth.js`) — `authLimiter` caps each IP to 10 requests per 15-minute window across both endpoints, returning `429 { error: 'Too many requests...' }` once exceeded.

**Verified:** Repeated login attempts from the same client returned `429` after the limit was hit.

---

## VULN-003

**Severity:** High
**Issue:** No account lockout existed — an attacker could retry passwords against a known email indefinitely (bounded only by VULN-002's IP-based limiter, which doesn't protect against distributed attempts).

**Fix:**
- `backend/config/db.js` — added `failed_attempts` and `locked_until` columns to `users` (with a migration for existing databases via `PRAGMA table_info` + `ALTER TABLE`).
- `backend/models/User.js` — added `isLocked()`, `recordFailedAttempt()` (locks the account for 15 minutes after 5 consecutive failures), and `resetFailedAttempts()`.
- `backend/routes/auth.js` — `/login` now checks `isLocked(user)` before verifying the password, calls `recordFailedAttempt()` on a wrong password, and `resetFailedAttempts()` on success.

**Verified:** 5 wrong-password attempts against a test account locked it; a 6th attempt with the *correct* password was still rejected with `429 "Account temporarily locked... try again in 15 minutes."`.

---

## VULN-004

**Severity:** High
**Issue:** No security-headers middleware — responses had no CSP, `X-Frame-Options`, `X-Content-Type-Options`, or HSTS, making any future XSS more damaging and leaving the login/dashboard pages clickjacking-able.

**Fix:** Added `helmet` in `backend/app.js` with a CSP restricting `script-src`/`default-src` to `'self'` and allowlisting only `fonts.googleapis.com` / `fonts.gstatic.com` for styles/fonts. Because `script-src` no longer allows `'unsafe-inline'`, the `onclick="..."` attributes in `frontend/index.html` (tab switcher, logout button) were removed and rewired via `addEventListener` in `frontend/app.js`'s `init()` — otherwise the CSP would have silently broken those buttons.

**Verified:** Response headers now include `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`; manually confirmed the login tabs and logout button still work with the new CSP in place.

---

## VULN-005

**Severity:** Medium
**Issue:** Registering with an already-used email returned `409 { error: 'An account with this email already exists' }`, letting an attacker enumerate registered emails.

**Fix:** `backend/routes/auth.js` now returns a generic `400 { error: 'Unable to complete registration with the provided details.' }` regardless of the reason, matching the pattern already used by `/login`. This endpoint is also covered by the VULN-002 rate limiter, which slows down enumeration attempts further.

**Verified:** Registering with a duplicate email now returns the generic message instead of confirming the account's existence.

---

## VULN-006

**Severity:** Medium
**Issue:** `app.use(cors())` in `backend/app.js` had no options, so any origin could call the API.

**Fix:** CORS is now restricted to `process.env.ALLOWED_ORIGIN` (defaults to `http://localhost:3000`) with `credentials: true` (required for the httpOnly cookie from VULN-001 to work). Added `ALLOWED_ORIGIN` to `.env` / `.env.example`.

**Verified:** A request with `Origin: http://evil-site.com` still receives `Access-Control-Allow-Origin: http://localhost:3000` in the response (never reflects the attacker's origin), so a browser would block that origin from reading the response.

---

## VULN-007

**Severity:** Medium
**Issue:** JWTs were valid for 7 days with no server-side revocation — a stolen token stayed usable for up to a week even after the user "logged out" (which only cleared client-side storage).

**Fix (mitigated, not fully eliminated):**
- Shortened token lifetime from 7 days to 1 day (`TOKEN_EXPIRY` in `backend/routes/auth.js`).
- Added `POST /api/auth/logout`, which clears the httpOnly cookie server-side via `res.clearCookie()`.
- Combined with VULN-001 (httpOnly storage), the token is now far harder to steal in the first place, which addresses the more likely attack path.

**Accepted residual risk:** This app has no server-side token denylist/refresh-token rotation, so a token that *is* somehow exfiltrated before logout remains valid for up to 24 hours. Full mitigation would require a refresh-token flow or a revocation store, which was judged disproportionate for this app's scope — documented here per the "nothing should be claimed without evidence" rule so this tradeoff is explicit rather than silently missing.

---

## VULN-008

**Severity:** Low
**Issue:** Task titles and usernames had client-side `maxlength` attributes only; the API itself accepted arbitrarily long values.

**Fix:** `backend/routes/tasks.js` — added `.isLength({ max: 200 })` to the `title` validator on both `POST /api/tasks` and `PUT /api/tasks/:id`. `backend/routes/auth.js` — added `.isLength({ min: 2, max: 50 })` and a `^[a-zA-Z0-9 _-]+$` character allow-list to the `username` validator on registration.

**Verified:** A 250-character task title is now rejected with `400 "Task title cannot exceed 200 characters"`; a username containing `<script>` is rejected with `400 "Username may only contain letters, numbers, spaces, underscores, and dashes"`.

---

## VULN-009

**Severity:** Low
**Issue:** Password policy only required 6 characters with no complexity check.

**Fix:** `backend/routes/auth.js` — registration now requires `isLength({ min: 8 })` plus `.matches(/\d/)` (at least one digit).

**Verified:** A password with only letters is rejected with `400 "Password must contain at least one number"`; a 6-character password is rejected with `400 "Password must be at least 8 characters"`.

---

## BUG-005

**Severity:** Critical (functional — discovered while verifying the fixes above)
**Issue:** Registration and task creation crashed with `Cannot read properties of undefined (reading 'id')` whenever the app ran against the on-disk database (i.e. outside of `NODE_ENV=test`). `models/User.js` and `models/Task.js`'s shared `execute()` helper called `saveDb()` (which calls sql.js's `db.export()`) **before** reading `last_insert_rowid()` — `db.export()` resets rowid tracking on the connection, so the subsequent lookup always returned `null`. This bug was invisible in the Jest suite because `saveDb()` is a no-op in test mode (in-memory DB), so it only manifested in real usage.

**Fix:** Reordered both `execute()` implementations (`backend/models/User.js`, `backend/models/Task.js`) to read `last_insert_rowid()` immediately after the write, *then* call `saveDb()`.

**Verified:** Registration and task creation now succeed against the real `todo.db` file (previously only worked in the test's in-memory DB).

---

## What was already secure (verified, unchanged)

- SQL injection: all queries use parameterized `stmt.bind()` / `db.run(sql, params)` — no string concatenation into SQL anywhere.
- XSS (DOM): all user content is rendered via `.textContent`, never `.innerHTML`.
- Passwords hashed with `bcryptjs`, 12 rounds.
- All task queries scoped by `user_id` — no IDOR.
- No secrets committed to git — `backend/.env` is `.gitignore`d and confirmed absent from git history.
- `npm audit` reports 0 known vulnerabilities across all dependencies.
