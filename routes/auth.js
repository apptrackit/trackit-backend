const express = require('express');
const router = express.Router();
const { validateApiKey } = require('../auth');
const authController = require('../controllers/authController');

// Register a new user
router.post('/register', validateApiKey, authController.register);

// Login endpoint
router.post('/login', validateApiKey, authController.login);

module.exports = router;
