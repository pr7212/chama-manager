const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');

const { addMember, getMembers } = require('../controllers/memberController');

// Protected Routes
router.post('/', verifyToken, addMember);
router.get('/', verifyToken, getMembers);

module.exports = router;
