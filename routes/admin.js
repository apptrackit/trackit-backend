const express = require('express');
const router = express.Router();
const { validateAdminApiKey, validateAdminToken } = require('../auth');
const adminController = require('../controllers/adminController');
const crypto = require('crypto');
const { db } = require('../database');
const logger = require('../utils/logger');

// Admin login - generates bearer token
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const clientIP = req.ip;
  
  logger.info(`Admin login attempt for username: ${username} from ${clientIP}`);
  
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    try {
      // Generate bearer token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

      // Clean up expired tokens for this user
      const cleanupResult = await db.query('DELETE FROM admin_sessions WHERE username = $1 OR expires_at <= NOW()', [username]);
      if (cleanupResult.rowCount > 0) {
        logger.info(`Cleaned up ${cleanupResult.rowCount} expired admin tokens for ${username}`);
      }

      // Store new token
      await db.query(
        'INSERT INTO admin_sessions (token, username, expires_at) VALUES ($1, $2, $3)',
        [token, username, expiresAt]
      );

      logger.info(`Admin login successful for ${username} from ${clientIP}. Token expires at ${expiresAt.toISOString()}`);

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
      logger.error(`Error creating admin session for ${username} from ${clientIP}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to create session'
      });
    }
  } else {
    logger.warn(`Failed admin login attempt for username: ${username} from ${clientIP}`);
    res.status(401).json({
      success: false,
      error: 'Invalid admin credentials'
    });
  }
});

// Token validation endpoint
router.post('/validate-token', validateAdminToken, (req, res) => {
  logger.info(`Admin token validation successful for ${req.adminUser.username} from ${req.ip}`);
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
  const username = req.adminUser.username;
  
  try {
    const result = await db.query('DELETE FROM admin_sessions WHERE token = $1', [token]);
    logger.info(`Admin logout successful for ${username} from ${req.ip}. Deleted ${result.rowCount} session(s)`);
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error(`Error during admin logout for ${username} from ${req.ip}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout'
    });
  }
});

// All other admin routes now use bearer token authentication
router.post('/user', validateAdminToken, (req, res) => {
  logger.info(`Admin user info request from ${req.adminUser.username} at ${req.ip}`);
  adminController.getUserInfo(req, res);
});

router.get('/getAllUserData', validateAdminToken, (req, res) => {
  logger.info(`Admin getAllUserData request from ${req.adminUser.username} at ${req.ip}`);
  adminController.getAllUserData(req, res);
});

router.get('/emails', validateAdminToken, (req, res) => {
  logger.info(`Admin emails request from ${req.adminUser.username} at ${req.ip}`);
  adminController.getAllEmails(req, res);
});

router.post('/updateUser', validateAdminToken, (req, res) => {
  logger.info(`Admin updateUser request from ${req.adminUser.username} at ${req.ip} for user ID: ${req.body.id}`);
  adminController.updateUser(req, res);
});

router.post('/deleteUser', validateAdminToken, (req, res) => {
  logger.info(`Admin deleteUser request from ${req.adminUser.username} at ${req.ip} for user ID: ${req.body.id}`);
  adminController.deleteUser(req, res);
});

router.post('/createUser', validateAdminToken, (req, res) => {
  logger.info(`Admin createUser request from ${req.adminUser.username} at ${req.ip} for username: ${req.body.username}`);
  adminController.createUser(req, res);
});

router.get('/registrations', validateAdminToken, (req, res) => {
  logger.info(`Admin registrations request from ${req.adminUser.username} at ${req.ip} with range: ${req.query.range}`);
  adminController.getRegistrations(req, res);
});

router.get('/active-users', validateAdminToken, (req, res) => {
  logger.info(`Admin active-users request from ${req.adminUser.username} at ${req.ip} with range: ${req.query.range}`);
  adminController.getActiveUsers(req, res);
});

router.get('/hardwareinfo', validateAdminToken, (req, res) => {
  logger.info(`Admin hardwareinfo request from ${req.adminUser.username} at ${req.ip}`);
  adminController.getHardwareInfo(req, res);
});

// Legacy check endpoint (keep for backward compatibility)
router.post('/check', (req, res) => {
  const { username, password } = req.body;
  
  logger.info(`Legacy admin check request for username: ${username} from ${req.ip}`);
  
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    logger.info(`Legacy admin check successful for ${username} from ${req.ip}`);
    res.json({
      success: true,
      username: username
    });
  } else {
    logger.warn(`Legacy admin check failed for username: ${username} from ${req.ip}`);
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

module.exports = router;