const { getDb, saveDb } = require('../config/db');

// ── Shared sql.js helpers (duplicated here to keep models self-contained) ────

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

function queryOne(sql, params = []) {
  return queryAll(sql, params)[0];
}

// IMPORTANT: last_insert_rowid() must be read BEFORE saveDb() — saveDb() calls
// db.export(), which resets rowid tracking on the sql.js connection.
function execute(sql, params = []) {
  const db = getDb();
  db.run(sql, params);
  const result = queryOne('SELECT last_insert_rowid() as id');
  saveDb();
  return result ? result.id : null;
}

// ── Task operations ──────────────────────────────────────────────────────────

/**
 * Create a new task for a user.
 * @returns {object} { id, title, completed, createdAt }
 */
function createTask(userId, title) {
  const id = execute(
    'INSERT INTO tasks (user_id, title) VALUES (?, ?)',
    [userId, title]
  );
  return getTaskById(id, userId);
}

/**
 * Get a single task by ID, scoped to a specific user.
 */
function getTaskById(id, userId) {
  const row = queryOne(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return row ? formatTask(row) : undefined;
}

/**
 * Get all tasks for a specific user, newest first.
 */
function getTasksByUser(userId) {
  const rows = queryAll(
    'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows.map(formatTask);
}

/**
 * Update a task's title and/or completed status. Owner-only.
 */
function updateTask(id, userId, fields) {
  const existing = getTaskById(id, userId);
  if (!existing) return undefined;

  const newTitle     = fields.title !== undefined ? fields.title : existing.title;
  const newCompleted = fields.completed !== undefined ? (fields.completed ? 1 : 0) : (existing.completed ? 1 : 0);

  execute(
    'UPDATE tasks SET title = ?, completed = ? WHERE id = ? AND user_id = ?',
    [newTitle, newCompleted, id, userId]
  );

  return getTaskById(id, userId);
}

/**
 * Delete a task. Owner-only. Returns true if a row was deleted.
 */
function deleteTask(id, userId) {
  const existing = getTaskById(id, userId);
  if (!existing) return false;
  execute('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);
  return true;
}

/**
 * Converts a raw DB row to a clean API-ready object.
 * sql.js returns integers for booleans, so we cast explicitly.
 */
function formatTask(row) {
  return {
    id:        Number(row.id),
    title:     row.title,
    completed: row.completed === 1 || row.completed === true,
    createdAt: row.created_at,
  };
}

module.exports = { createTask, getTaskById, getTasksByUser, updateTask, deleteTask };
