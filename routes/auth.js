const express = require('express');
const router = express.Router();
const { validateApiKey, validateToken } = require('../auth');
const authController = require('../controllers/authController');

// Login endpoint
router.post('/login', authController.login);

// Refresh token endpoint
router.post('/refresh', validateApiKey, authController.refreshToken);

// Logout endpoint
router.post('/logout', validateApiKey, authController.logout);

// Logout from all devices endpoint
router.post('/logout-all', validateApiKey, authController.logoutAll);

// List active sessions endpoint
router.post('/sessions', validateApiKey, authController.listSessions);

// Check session status
router.get('/check', validateApiKey, authController.checkSession);

module.exports = router;