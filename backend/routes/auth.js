const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const {
  createUser,
  findByEmail,
  findById,
  isLocked,
  recordFailedAttempt,
  resetFailedAttempts,
  LOCKOUT_DURATION_MS,
} = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = '1d';
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000; // must match TOKEN_EXPIRY

// Brute-force protection: cap auth attempts per IP regardless of account lockout.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

/**
 * Signs a JWT and sets it as an httpOnly cookie. The token is also returned
 * in the response body for API/CLI clients that can't use cookies (and for
 * the automated test suite), but the browser frontend relies on the cookie
 * only — it never stores the token in JS-accessible storage.
 */
function issueSession(res, user) {
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_MAX_AGE_MS,
  });

  return token;
}

/**
 * POST /api/auth/register
 * Creates a new user account. Sets an httpOnly session cookie on success.
 */
router.post(
  '/register',
  authLimiter,
  [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Username must be between 2 and 50 characters')
      .matches(/^[a-zA-Z0-9 _-]+$/)
      .withMessage('Username may only contain letters, numbers, spaces, underscores, and dashes'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/\d/)
      .withMessage('Password must contain at least one number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, email, password } = req.body;

    try {
      // Generic failure message — avoids confirming whether the email is
      // already registered (prevents account enumeration).
      const existing = findByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'Unable to complete registration with the provided details.' });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = createUser(username, email, passwordHash);
      const token = issueSession(res, user);

      return res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err) {
      console.error('Register error:', err.message);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticates an existing user. Sets an httpOnly session cookie on success.
 * Enforces per-account lockout after repeated failed attempts.
 */
router.post(
  '/login',
  authLimiter,
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

      // Use the same error for "not found" and "wrong password" to avoid
      // leaking which emails are registered.
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (isLocked(user)) {
        const lockoutMinutes = Math.round(LOCKOUT_DURATION_MS / 60000);
        return res.status(429).json({
          error: `Account temporarily locked due to too many failed login attempts. Please try again in ${lockoutMinutes} minutes.`,
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        recordFailedAttempt(user.id);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      resetFailedAttempts(user.id);
      const token = issueSession(res, user);

      return res.status(200).json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err) {
      console.error('Login error:', err.message);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

/**
 * POST /api/auth/logout
 * Clears the session cookie. (The JWT itself remains valid until it expires
 * — see SECURITY.md for the accepted tradeoff and rationale.)
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  return res.status(200).json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Returns the current user based on the session cookie/Bearer token.
 * Lets the frontend check auth state on load without storing the token
 * in JS-accessible storage.
 */
router.get('/me', authMiddleware, (req, res) => {
  const user = findById(req.user.id);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: invalid session' });
  }
  return res.status(200).json({ user: { id: user.id, username: user.username, email: user.email } });
});

module.exports = router;
