const express = require('express');
const router = express.Router();
const { validateAdminToken } = require('../auth');
const adminController = require('../controllers/adminController');
const crypto = require('crypto');
const { db } = require('../database');
const logger = require('../utils/logger');

/**
 * @swagger
 * /admin/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 bearerToken:
 *                   type: string
 *                 adminApiKey:
 *                   type: string
 *                 apiKey:
 *                   type: string
 *                 username:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
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

/**
 * @swagger
 * /admin/validate-token:
 *   post:
 *     summary: Validate admin token
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Invalid token
 */
router.post('/validate-token', validateAdminToken, (req, res) => {
  logger.info(`Admin token validation successful for ${req.adminUser.username} from ${req.ip}`);
  res.json({
    success: true,
    username: req.adminUser.username,
    message: 'Token is valid'
  });
});

/**
 * @swagger
 * /admin/logout:
 *   post:
 *     summary: Admin logout
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Invalid token
 */
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

/**
 * @swagger
 * /admin/user:
 *   post:
 *     summary: Get user information
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *       401:
 *         description: Invalid token
 */
router.post('/user', validateAdminToken, (req, res) => {
  logger.info(`Admin user info request from ${req.adminUser.username} at ${req.ip}`);
  adminController.getUserInfo(req, res);
});

/**
 * @swagger
 * /admin/getAllUserData:
 *   get:
 *     summary: Get all user data
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All user data retrieved successfully
 *       401:
 *         description: Invalid token
 */
router.get('/getAllUserData', validateAdminToken, (req, res) => {
  logger.info(`Admin getAllUserData request from ${req.adminUser.username} at ${req.ip}`);
  adminController.getAllUserData(req, res);
});

/**
 * @swagger
 * /admin/emails:
 *   get:
 *     summary: Get all user emails
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All emails retrieved successfully
 *       401:
 *         description: Invalid token
 */
router.get('/emails', validateAdminToken, (req, res) => {
  logger.info(`Admin emails request from ${req.adminUser.username} at ${req.ip}`);
  adminController.getAllEmails(req, res);
});

/**
 * @swagger
 * /admin/updateUser:
 *   post:
 *     summary: Update user information
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *               username:
 *                 type: string
 *                 nullable: true
 *               email:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *               password:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: User updated successfully
 *       401:
 *         description: Invalid token
 */
router.post('/updateUser', validateAdminToken, (req, res) => {
  logger.info(`Admin updateUser request from ${req.adminUser.username} at ${req.ip} for user ID: ${req.body.id}`);
  adminController.updateUser(req, res);
});

/**
 * @swagger
 * /admin/deleteUser:
 *   post:
 *     summary: Delete a user
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Invalid token
 */
router.post('/deleteUser', validateAdminToken, (req, res) => {
  logger.info(`Admin deleteUser request from ${req.adminUser.username} at ${req.ip} for user ID: ${req.body.id}`);
  adminController.deleteUser(req, res);
});

/**
 * @swagger
 * /admin/createUser:
 *   post:
 *     summary: Create a new user
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User created successfully
 *       401:
 *         description: Invalid token
 */
router.post('/createUser', validateAdminToken, (req, res) => {
  logger.info(`Admin createUser request from ${req.adminUser.username} at ${req.ip} for username: ${req.body.username}`);
  adminController.createUser(req, res);
});

/**
 * @swagger
 * /admin/registrations:
 *   get:
 *     summary: Get user registrations
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Registrations retrieved successfully
 *       401:
 *         description: Invalid token
 */
router.get('/registrations', validateAdminToken, (req, res) => {
  logger.info(`Admin registrations request from ${req.adminUser.username} at ${req.ip} with range: ${req.query.range}`);
  adminController.getRegistrations(req, res);
});

/**
 * @swagger
 * /admin/active-users:
 *   get:
 *     summary: Get active users
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Active users retrieved successfully
 *       401:
 *         description: Invalid token
 */
router.get('/active-users', validateAdminToken, (req, res) => {
  logger.info(`Admin active-users request from ${req.adminUser.username} at ${req.ip} with range: ${req.query.range}`);
  adminController.getActiveUsers(req, res);
});

/**
 * @swagger
 * /admin/hardwareinfo:
 *   get:
 *     summary: Get hardware information
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Hardware information retrieved successfully
 *       401:
 *         description: Invalid token
 */
router.get('/hardwareinfo', validateAdminToken, (req, res) => {
  logger.info(`Admin hardwareinfo request from ${req.adminUser.username} at ${req.ip}`);
  adminController.getHardwareInfo(req, res);
});

/**
 * @swagger
 * /admin/environment:
 *   get:
 *     summary: Get environment information
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Environment information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 environment:
 *                   type: string
 *                   enum: [development, production]
 *                 nodeEnv:
 *                   type: string
 *       401:
 *         description: Invalid token
 */
router.get('/environment', validateAdminToken, (req, res) => {
  logger.info(`Admin environment request from ${req.adminUser.username} at ${req.ip}`);
  adminController.getEnvironmentInfo(req, res);
});

/**
 * @swagger
 * /admin/check:
 *   post:
 *     summary: Legacy admin check (deprecated)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Check successful
 *       401:
 *         description: Invalid credentials
 *     deprecated: true
 */
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