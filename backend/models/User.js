const { getDb, saveDb } = require('../config/db');

/**
 * Runs a sql.js query and returns all matching rows as plain objects.
 * @param {string} sql
 * @param {any[]} params
 * @returns {object[]}
 */
function queryAll(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Runs a sql.js query and returns the first matching row, or undefined.
 */
function queryOne(sql, params = []) {
  return queryAll(sql, params)[0];
}

/**
 * Executes a write statement (INSERT/UPDATE/DELETE) and returns last insert rowid.
 * IMPORTANT: last_insert_rowid() must be read BEFORE saveDb() — saveDb() calls
 * db.export(), which resets rowid tracking on the sql.js connection.
 */
function execute(sql, params = []) {
  const db = getDb();
  db.run(sql, params);
  const result = queryOne('SELECT last_insert_rowid() as id');
  saveDb();
  return result ? result.id : null;
}

// ── User operations ──────────────────────────────────────────────────────────

/**
 * Create a new user record.
 */
function createUser(username, email, passwordHash) {
  const id = execute(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
    [username, email, passwordHash]
  );
  return findById(id);
}

/**
 * Find a user by their email address (includes password_hash for auth checks).
 */
function findByEmail(email) {
  return queryOne('SELECT * FROM users WHERE email = ?', [email]);
}

/**
 * Find a user by their ID — excludes password_hash.
 */
function findById(id) {
  return queryOne(
    'SELECT id, username, email, created_at FROM users WHERE id = ?',
    [id]
  );
}

// ── Account lockout helpers (brute-force protection) ─────────────────────────

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Returns true if the user's account is currently locked out.
 */
function isLocked(user) {
  return !!user.locked_until && new Date(user.locked_until).getTime() > Date.now();
}

/**
 * Records a failed login attempt. Locks the account for LOCKOUT_DURATION_MS
 * once MAX_FAILED_ATTEMPTS consecutive failures have been reached.
 */
function recordFailedAttempt(id) {
  const user = queryOne('SELECT failed_attempts FROM users WHERE id = ?', [id]);
  if (!user) return;

  const attempts = user.failed_attempts + 1;
  const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS
    ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
    : null;

  execute(
    'UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?',
    [attempts, lockedUntil, id]
  );
}

/**
 * Clears failed-attempt count and lockout on a successful login.
 */
function resetFailedAttempts(id) {
  execute(
    'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?',
    [id]
  );
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  isLocked,
  recordFailedAttempt,
  resetFailedAttempts,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
};
