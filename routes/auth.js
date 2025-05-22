const express = require('express');
const router = express.Router();
const { validateApiKey, validateToken } = require('../auth');
const authController = require('../controllers/authController');

// Login endpoint
router.post('/login', validateApiKey, authController.login);

// Logout endpoint
router.post('/logout', validateApiKey, validateToken, authController.logout);

// Check session status
router.get('/check', validateApiKey, authController.checkSession);

module.exports = router;
