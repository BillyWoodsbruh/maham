const jwt = require('jsonwebtoken');

/**
 * Middleware that verifies a JWT from the Authorization header.
 * Attaches the decoded payload to req.user on success.
 * Returns 401 with { error } on failure — never exposes internals.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: no token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
}

module.exports = authMiddleware;
