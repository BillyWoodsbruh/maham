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
 */
function execute(sql, params = []) {
  const db = getDb();
  db.run(sql, params);
  saveDb();
  // Return last insert rowid
  const result = queryOne('SELECT last_insert_rowid() as id');
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

module.exports = { createUser, findByEmail, findById };
