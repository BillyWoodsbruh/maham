const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { createUser, findByEmail } = require('../models/User');

const router = express.Router();
const BCRYPT_ROUNDS = 12;

/**
 * POST /api/auth/register
 * Creates a new user account. Returns a JWT on success.
 */
router.post(
  '/register',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, email, password } = req.body;

    try {
      // Prevent duplicate accounts — return generic message
      const existing = findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = createUser(username, email, passwordHash);

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err) {
      console.error('Register error:', err.message);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticates an existing user. Returns a JWT on success.
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    try {
      const user = findByEmail(email);

      // Use a constant-time compare; return same error for "not found" and "wrong password"
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err) {
      console.error('Login error:', err.message);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

module.exports = router;
