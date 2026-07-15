/**
 * config/db.js
 * Initializes a sql.js (pure-JS SQLite) database instance.
 * Uses an in-memory DB during tests for full isolation.
 * In production, persists to disk via periodic saves.
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const isTest = process.env.NODE_ENV === 'test';
const DB_PATH = path.join(__dirname, '..', 'todo.db');

let db; // sql.js Database instance

/**
 * Loads or creates the SQLite database and applies the schema.
 * Must be called (and awaited) once before the app starts handling requests.
 */
async function initDb() {
  const SQL = await initSqlJs();

  if (isTest) {
    // In-memory only — isolated per test run
    db = new SQL.Database();
  } else {
    // Load from disk if it exists, otherwise create fresh
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  return db;
}

/**
 * Returns the active database instance.
 * Throws if initDb() has not been called yet.
 */
function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

/**
 * Persists the in-memory sql.js database to disk.
 * Call this after any write operation in production.
 */
function saveDb() {
  if (isTest || !db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

module.exports = { initDb, getDb, saveDb };
