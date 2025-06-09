const express = require('express');
const router = express.Router();
const { validateAdminApiKey, validateAdminToken } = require('../auth');
const adminController = require('../controllers/adminController');
const crypto = require('crypto');
const { db } = require('../database');

// Admin login - generates bearer token
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    try {
      // Generate bearer token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

      // Clean up expired tokens for this user
      await db.query('DELETE FROM admin_sessions WHERE username = $1 OR expires_at <= NOW()', [username]);

      // Store new token
      await db.query(
        'INSERT INTO admin_sessions (token, username, expires_at) VALUES ($1, $2, $3)',
        [token, username, expiresAt]
      );

      res.json({
        success: true,
        bearerToken: token,
        adminApiKey: process.env.ADMIN_API_KEY,
        apiKey: process.env.API_KEY,
        username: username,
        message: 'Admin login successful',
        expiresAt: expiresAt.toISOString()
      });
    } catch (error) {
      console.error('Error creating admin session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create session'
      });
    }
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid admin credentials'
    });
  }
});

// Token validation endpoint
router.post('/validate-token', validateAdminToken, (req, res) => {
  res.json({
    success: true,
    username: req.adminUser.username,
    message: 'Token is valid'
  });
});

// Logout endpoint
router.post('/logout', validateAdminToken, async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader.split(' ')[1];
  
  try {
    await db.query('DELETE FROM admin_sessions WHERE token = $1', [token]);
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Error during admin logout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout'
    });
  }
});

// All other admin routes now use bearer token authentication
router.post('/user', validateAdminToken, adminController.getUserInfo);
router.get('/getAllUserData', validateAdminToken, adminController.getAllUserData);
router.get('/emails', validateAdminToken, adminController.getAllEmails);
router.post('/updateUser', validateAdminToken, adminController.updateUser);
router.post('/deleteUser', validateAdminToken, adminController.deleteUser);
router.post('/createUser', validateAdminToken, adminController.createUser);
router.get('/registrations', validateAdminToken, adminController.getRegistrations);
router.get('/active-users', validateAdminToken, adminController.getActiveUsers);
router.get('/hardwareinfo', validateAdminToken, adminController.getHardwareInfo);

// Legacy check endpoint (keep for backward compatibility)
router.post('/check', (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    res.json({
      success: true,
      username: username
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

module.exports = router;