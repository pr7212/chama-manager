const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');

const {
  getMemberStatement,
  generateStatementPDF,
} = require('../controllers/statementController');

/**
 * Download member statement as PDF
 */
router.get('/pdf/:id', verifyToken, generateStatementPDF);

/**
 * Get member statement (JSON view)
 */
router.get('/:id', verifyToken, getMemberStatement);

module.exports = router;
