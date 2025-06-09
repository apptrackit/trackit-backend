const express = require('express');
const router = express.Router();
const { validateApiKey, validateToken } = require('../auth');
const authController = require('../controllers/authController');

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login to the application
 *     tags: [Auth]
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
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh authentication token
 *     tags: [Auth]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *               - deviceId
 *             properties:
 *               refreshToken:
 *                 type: string
 *               deviceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid API key or refresh token
 */
router.post('/refresh', validateApiKey, authController.refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout from current session
 *     tags: [Auth]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - userId
 *             properties:
 *               deviceId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Invalid API key
 */
router.post('/logout', validateApiKey, authController.logout);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Auth]
 *     security:
 *       - ApiKeyAuth: []
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
 *         description: Logout from all devices successful
 *       401:
 *         description: Invalid API key
 */
router.post('/logout-all', validateApiKey, authController.logoutAll);

/**
 * @swagger
 * /auth/sessions:
 *   post:
 *     summary: List active sessions
 *     tags: [Auth]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions
 *       401:
 *         description: Invalid API key
 */
router.post('/sessions', validateApiKey, authController.listSessions);

/**
 * @swagger
 * /auth/check:
 *   get:
 *     summary: Check session status
 *     tags: [Auth]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Session is valid
 *       401:
 *         description: Invalid API key or session
 */
router.get('/check', validateApiKey, authController.checkSession);

module.exports = router;