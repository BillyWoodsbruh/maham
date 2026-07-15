const jwt = require('jsonwebtoken');

/**
 * Middleware that verifies a JWT, preferring the httpOnly `token` cookie
 * (used by the browser frontend) and falling back to a Bearer header
 * (used by API clients and the test suite).
 * Attaches the decoded payload to req.user on success.
 * Returns 401 with { error } on failure — never exposes internals.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;
  const token = req.cookies?.token || bearerToken;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
}

module.exports = authMiddleware;
