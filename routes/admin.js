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
 * /admin/user-sessions:
 *   post:
 *     summary: Get user sessions (admin only)
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User sessions retrieved successfully
 *       401:
 *         description: Invalid token
 */
router.post('/user-sessions', validateAdminToken, (req, res) => {
  logger.info(`Admin user-sessions request from ${req.adminUser.username} at ${req.ip} for user: ${req.body.userId}`);
  adminController.getUserSessions(req, res);
});

/**
 * @swagger
 * /admin/logout-user-session:
 *   post:
 *     summary: Logout specific user session (admin only)
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - deviceId
 *             properties:
 *               userId:
 *                 type: string
 *               deviceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User session logged out successfully
 *       401:
 *         description: Invalid token
 */
router.post('/logout-user-session', validateAdminToken, (req, res) => {
  logger.info(`Admin logout-user-session request from ${req.adminUser.username} at ${req.ip} for user: ${req.body.userId}`);
  adminController.logoutUserSession(req, res);
});

/**
 * @swagger
 * /admin/logout-all-user-sessions:
 *   post:
 *     summary: Logout all user sessions (admin only)
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: All user sessions logged out successfully
 *       401:
 *         description: Invalid token
 */
router.post('/logout-all-user-sessions', validateAdminToken, (req, res) => {
  logger.info(`Admin logout-all-user-sessions request from ${req.adminUser.username} at ${req.ip} for user: ${req.body.userId}`);
  adminController.logoutAllUserSessions(req, res);
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

/**
 * @swagger
 * /admin/images:
 *   get:
 *     summary: Get all images (admin only)
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     responses:
 *       200:
 *         description: All images retrieved successfully
 *       401:
 *         description: Invalid token
 */
router.get('/images', validateAdminToken, (req, res) => {
  logger.info(`Admin getAllImages request from ${req.adminUser.username} at ${req.ip}`);
  adminController.getAllImages(req, res);
});

/**
 * @swagger
 * /admin/image/{id}:
 *   get:
 *     summary: Get image data (admin only)
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image data retrieved successfully
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Invalid token
 *       404:
 *         description: Image not found
 */
router.get('/image/:id', validateAdminToken, (req, res) => {
  logger.info(`Admin getImageData request from ${req.adminUser.username} at ${req.ip} for image: ${req.params.id}`);
  adminController.getImageData(req, res);
});

/**
 * @swagger
 * /admin/soft-delete-image:
 *   post:
 *     summary: Soft delete an image (admin only)
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
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
 *                 type: integer
 *     responses:
 *       200:
 *         description: Image soft deleted successfully
 *       401:
 *         description: Invalid token
 *       404:
 *         description: Image not found or already deleted
 */
router.post('/soft-delete-image', validateAdminToken, (req, res) => {
  logger.info(`Admin softDeleteImage request from ${req.adminUser.username} at ${req.ip} for image: ${req.body.id}`);
  adminController.softDeleteImage(req, res);
});

/**
 * @swagger
 * /admin/permanent-delete-image:
 *   post:
 *     summary: Permanently delete an image (admin only)
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
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
 *                 type: integer
 *     responses:
 *       200:
 *         description: Image permanently deleted successfully
 *       401:
 *         description: Invalid token
 *       404:
 *         description: Image not found
 */
router.post('/permanent-delete-image', validateAdminToken, (req, res) => {
  logger.info(`Admin permanentDeleteImage request from ${req.adminUser.username} at ${req.ip} for image: ${req.body.id}`);
  adminController.permanentDeleteImage(req, res);
});

/**
 * @swagger
 * /admin/restore-image:
 *   post:
 *     summary: Restore a soft-deleted image (admin only)
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
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
 *                 type: integer
 *     responses:
 *       200:
 *         description: Image restored successfully
 *       401:
 *         description: Invalid token
 *       404:
 *         description: Image not found or not deleted
 */
router.post('/restore-image', validateAdminToken, (req, res) => {
  logger.info(`Admin restoreImage request from ${req.adminUser.username} at ${req.ip} for image: ${req.body.id}`);
  adminController.restoreImage(req, res);
});

module.exports = router;