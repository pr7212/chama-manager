const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const { addMember, getMembers } = require('../controllers/memberController');

/**
 * Create new member (admin only recommended)
 */
router.post('/', verifyToken, authorizeRoles('admin'), addMember);

/**
 * Get all members (authenticated users)
 */
router.get('/', verifyToken, getMembers);

module.exports = router;
