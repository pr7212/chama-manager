const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for authenticated user
 */
const generateToken = (user) => {
  if (!user || !user.id) {
    throw new Error('Invalid user object for token generation');
  }

  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
};

module.exports = generateToken;
