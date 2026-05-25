const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

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

// Security / production hardening
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const corsOptions = {
  origin: ['http://localhost:5500', 'https://yourdomain.com'],
  credentials: false,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// Basic rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Stricter rate limit for login route
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.static(path.join(__dirname, '../public')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));

app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${req.method} ${req.url}`);
  }
  next();
});

pool
  .query('SELECT NOW()')
  .then(() => console.log('Database connected'))
  .catch((err) => console.error(err.message));

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

const PORT = process.env.PORT || 5000;

const createTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      phone VARCHAR(30) NOT NULL UNIQUE,
      national_id VARCHAR(50),
      email VARCHAR(120),
      role VARCHAR(50) NOT NULL DEFAULT 'Member',
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_by INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE members
    ADD COLUMN IF NOT EXISTS national_id VARCHAR(50)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contributions (
      id SERIAL PRIMARY KEY,
      member_id INTEGER REFERENCES members(id)
      ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      contribution_month VARCHAR(20),
      contribution_year INTEGER,
      payment_date DATE DEFAULT CURRENT_DATE,
      recorded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS loans (
      id SERIAL PRIMARY KEY,
      member_id INTEGER REFERENCES members(id)
      ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      interest_rate DECIMAL(5,2) NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      amount_paid DECIMAL(10,2) DEFAULT 0,
      remaining_balance DECIMAL(10,2) NOT NULL,
      due_date DATE,
      status VARCHAR(20) DEFAULT 'active',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS loan_payments (
      id SERIAL PRIMARY KEY,
      loan_id INTEGER REFERENCES loans(id)
      ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      payment_date DATE DEFAULT CURRENT_DATE,
      recorded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      channel VARCHAR(30) NOT NULL DEFAULT 'in_app',
      type VARCHAR(60) NOT NULL,
      title VARCHAR(120) NOT NULL,
      message TEXT NOT NULL,
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
      amount DECIMAL(10,2) NOT NULL,
      rule_type VARCHAR(50) DEFAULT 'manual',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fine_payments (
      id SERIAL PRIMARY KEY,
      fine_id INTEGER REFERENCES fines(id) ON DELETE CASCADE,
      member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      payment_date DATE DEFAULT CURRENT_DATE,
      recorded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS outstanding_fines (
      id SERIAL PRIMARY KEY,
      fine_id INTEGER REFERENCES fines(id) ON DELETE CASCADE,
      member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
      outstanding_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(
    `
      ALTER TABLE outstanding_fines
      ADD CONSTRAINT IF NOT EXISTS outstanding_fines_unique
      UNIQUE (fine_id, member_id)
    `
  );
};

createTables()
  .then(() => console.log('Database tables ready'))
  .catch((err) => console.error('Database table setup failed:', err.message));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
