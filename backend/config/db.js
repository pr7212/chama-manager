const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is missing. Create a .env file and set your Supabase/Postgres connection string.'
  );
  process.exit(1);
}

const isSupabase = process.env.DATABASE_URL.includes('supabase.co');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err);
});

module.exports = pool;
