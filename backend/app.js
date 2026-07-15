require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./config/db');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// ── Catch-all: serve frontend SPA for any non-API route ────────────────────
app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

/**
 * Initialize the database then export the app.
 * Callers (server.js and tests) should await this before starting.
 */
app.initDb = initDb;

module.exports = app;
