const express = require('express');
const { handleUssd } = require('../controllers/ussdController');

const router = express.Router();

router.post('/', handleUssd);

module.exports = router;
