const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env'), quiet: true });

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];

function validateEnv(required = REQUIRED_ENV) {
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}`
    );
  }
}

module.exports = {
  REQUIRED_ENV,
  validateEnv,
};
