const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Central Auth Service
 */

/**
 * Hash a plain text password
 * @param {string} password 
 * @returns {Promise<string>}
 */
const hashPassword = async (password) => {
  if (!password) throw new Error('Password is required');
  return await bcrypt.hash(password, 10);
};

/**
 * Compare plain text password with hash
 * @param {string} password 
 * @param {string} hash 
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hash) => {
  if (!password || !hash) return false;
  return await bcrypt.compare(password, hash);
};

/**
 * Generate a JWT token for a user
 * @param {object} user 
 * @returns {string}
 */
const generateToken = (user) => {
  if (!user || !user.id) {
    throw new Error('Invalid user object for token generation');
  }
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      group_id: user.group_id || 1,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
};

/**
 * Validate registration input
 * @param {object} data 
 * @returns {string[]} array of errors
 */
const validateRegisterInput = (data) => {
  const errors = [];
  const { full_name, phone, password } = data;

  if (!full_name || !full_name.trim()) {
    errors.push('Full name is required');
  }
  if (!phone || !phone.trim()) {
    errors.push('Phone number is required');
  } else if (!/^\+?[0-9\s-]{10,20}$/.test(phone.trim())) {
    errors.push('Invalid phone number format');
  }
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  return errors;
};

/**
 * Validate login input
 * @param {object} data 
 * @returns {string[]} array of errors
 */
const validateLoginInput = (data) => {
  const errors = [];
  const { phone, password } = data;

  if (!phone || !phone.trim()) {
    errors.push('Phone number is required');
  }
  if (!password) {
    errors.push('Password is required');
  }

  return errors;
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  validateRegisterInput,
  validateLoginInput,
};
