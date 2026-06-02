// promoteUser.js - promotes a user to admin by phone
// Usage: node scripts/promoteUser.js <phone>
require('dotenv').config({ path: './chama-system/.env' });
const pool = require('../chama-system/server/config/db');

const phone = process.argv[2];
if (!phone) {
  console.error('Usage: node scripts/promoteUser.js <phone>');
  process.exit(1);
}

(async () => {
  try {
    const update = await pool.query(
      'UPDATE users SET role=$1 WHERE phone=$2 RETURNING id, full_name, phone, role',
      ['admin', phone]
    );
    console.log(JSON.stringify(update.rows, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
