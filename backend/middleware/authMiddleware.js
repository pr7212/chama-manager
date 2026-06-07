const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('Authorization Header:', authHeader);

  if (!authHeader) {
    return res.status(401).json({
      message: 'Access denied. No token provided.',
    });
  }

  const parts = authHeader.split(' ');

  // Extra safety: ensures format is "Bearer <token>"
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      message: 'Invalid authorization format',
    });
  }

  const token = parts[1];

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    req.user = verified; // attach decoded payload
    next();
  } catch (error) {
    return res.status(403).json({
      message: 'Invalid or expired token',
    });
  }
};

module.exports = verifyToken;
