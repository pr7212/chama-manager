const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const pool = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const contributionRoutes = require('./routes/contributionRoutes');
const loanRoutes = require('./routes/loanRoutes');
const statementRoutes = require('./routes/statementRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const fineRoutes = require('./routes/fineRoutes');
const exportRoutes = require('./routes/exportRoutes');

const verifyToken = require('./middleware/authMiddleware');
const errorHandler = require('./middleware/errorMiddleware');

const app = express();

/**
 * SECURITY
 */
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5500',
    credentials: false,
  })
);

app.use(express.json({ limit: '1mb' }));

/**
 * GLOBAL RATE LIMIT
 */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

/**
 * LOGIN RATE LIMIT (FIXED: must be applied on route, not path-only middleware)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, try again later',
});

/**
 * STATIC FILES
 */
app.use(express.static(path.join(__dirname, '../public')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));

/**
 * REQUEST LOGGER
 */
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${req.method} ${req.url}`);
  }
  next();
});

/**
 * DB CHECK
 */
pool
  .query('SELECT NOW()')
  .then(() => console.log('Database connected'))
  .catch((err) => {
    console.error('Database connection failed:', err.message);
  });

/**
 * ROUTES
 */
app.get('/', (req, res) => {
  res.send('Chama Manager API Running...');
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);

app.use('/api/members', memberRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/statements', statementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/exports', exportRoutes);

app.get('/api/dashboard', verifyToken, (req, res) => {
  res.json({
    message: 'Protected dashboard data',
    user: req.user,
  });
});

/**
 * DATABASE TABLES
 */
const createTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      phone VARCHAR(30) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      phone VARCHAR(30) NOT NULL UNIQUE,
      national_id VARCHAR(50),
      email VARCHAR(120),
      role VARCHAR(50) DEFAULT 'Member',
      status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contributions (
      id SERIAL PRIMARY KEY,
      member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      contribution_month INTEGER NOT NULL CHECK (contribution_month BETWEEN 1 AND 12),
      contribution_year INTEGER NOT NULL,
      payment_date DATE DEFAULT CURRENT_DATE,
      recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (member_id, contribution_month, contribution_year)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS loans (
      id SERIAL PRIMARY KEY,
      member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      interest_rate DECIMAL(5,2) NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      amount_paid DECIMAL(10,2) DEFAULT 0,
      remaining_balance DECIMAL(10,2) NOT NULL,
      due_date DATE,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS loan_payments (
      id SERIAL PRIMARY KEY,
      loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      payment_date DATE DEFAULT CURRENT_DATE,
      recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100),
      entity_type VARCHAR(50),
      entity_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      channel VARCHAR(30) DEFAULT 'in_app',
      type VARCHAR(60),
      title VARCHAR(120),
      message TEXT,
      related_entity_type VARCHAR(50),
      related_entity_id INTEGER,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fines (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      amount DECIMAL(10,2) DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fine_payments (
      id SERIAL PRIMARY KEY,
      fine_id INTEGER REFERENCES fines(id) ON DELETE CASCADE,
      member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
      amount DECIMAL(10,2),
      payment_date DATE DEFAULT CURRENT_DATE,
      recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS outstanding_fines (
      id SERIAL PRIMARY KEY,
      fine_id INTEGER REFERENCES fines(id) ON DELETE CASCADE,
      member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
      outstanding_amount DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (fine_id, member_id)
    )
  `);

  // Indexes for performance (safe to run multiple times)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_contributions_member ON contributions(member_id)`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_loans_member ON loans(member_id)`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id)`
  );
};

createTables()
  .then(() => console.log('Database ready'))
  .catch((err) => console.error('DB setup failed:', err.message));

/**
 * ERROR HANDLER (must be last)
 */
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Local dev: start normally
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Vercel: export the app as a serverless function
module.exports = app;
