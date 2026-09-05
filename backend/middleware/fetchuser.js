const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

/**
 * Auth guard for protected routes. Reads the JWT from the `auth-token` header,
 * verifies it, and attaches `{ id }` to `req.user`.
 */
const fetchuser = (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) {
    return res.status(401).json({ error: 'Please authenticate using a valid token' });
  }
  try {
    const data = jwt.verify(token, jwtSecret);
    req.user = data.user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Please authenticate using a valid token' });
  }
};

module.exports = fetchuser;
