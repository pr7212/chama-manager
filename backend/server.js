const express = require('express');
const cors = require('cors');
const path = require('path');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { validateEnv } = require('./config/env');

validateEnv();

const pool = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const contributionRoutes = require('./routes/contributionRoutes');
const loanRoutes = require('./routes/loanRoutes');
const statementRoutes = require('./routes/statementRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const fineRoutes = require('./routes/fineRoutes');
const exportRoutes = require('./routes/exportRoutes');
const ussdRoutes = require('./routes/ussdRoutes');

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
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

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
const shouldServeFrontend = process.env.SERVE_FRONTEND !== 'false';

if (shouldServeFrontend) {
  const frontendRoot = path.join(__dirname, '../frontend');

  app.use(express.static(path.join(frontendRoot, 'public')));
  app.use('/css', express.static(path.join(frontendRoot, 'css')));
  app.use('/js', express.static(path.join(frontendRoot, 'js')));

  app.get('/', (req, res) => {
    res.redirect('/login.html');
  });
}

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
app.get('/api', (req, res) => {
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
app.use('/api/ussd', ussdRoutes);

app.get('/api/dashboard', verifyToken, (req, res) => {
  res.json({
    message: 'Protected dashboard data',
    user: req.user,
  });
});

/**
 * ERROR HANDLER (must be last)
 */
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
