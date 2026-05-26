const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const {
  issueLoan,
  recordLoanPayment,
  getLoans,
} = require('../controllers/loanController');

/**
 * Issue a loan (admin only)
 */
router.post('/', verifyToken, authorizeRoles('admin'), issueLoan);

/**
 * Record loan repayment (admin only)
 */
router.post(
  '/payment',
  verifyToken,
  authorizeRoles('admin'),
  recordLoanPayment
);

/**
 * Get all loans (authenticated users)
 */
router.get('/', verifyToken, getLoans);

module.exports = router;
