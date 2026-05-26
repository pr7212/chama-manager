const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const {
  addContribution,
  getContributions,
} = require('../controllers/contributionController');

// Create contribution (admin only)
router.post('/', verifyToken, authorizeRoles('Admin'), addContribution);

// Get contributions (any authenticated user)
router.get('/', verifyToken, getContributions);

module.exports = router;
