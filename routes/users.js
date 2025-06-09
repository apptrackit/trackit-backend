const express = require('express');
const router = express.Router();
const { validateApiKey } = require('../auth');
const userController = require('../controllers/userController');

/**
 * @swagger
 * /user/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/register', userController.register);

/**
 * @swagger
 * /user/change/password:
 *   post:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Invalid API key or current password
 */
router.post('/change/password', validateApiKey, userController.changePassword);

/**
 * @swagger
 * /user/change/username:
 *   post:
 *     summary: Change username
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newUsername
 *             properties:
 *               newUsername:
 *                 type: string
 *     responses:
 *       200:
 *         description: Username changed successfully
 *       401:
 *         description: Invalid API key
 */
router.post('/change/username', validateApiKey, userController.changeUsername);

/**
 * @swagger
 * /user/change/email:
 *   post:
 *     summary: Change email address
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - newEmail
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               newEmail:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email changed successfully
 *       401:
 *         description: Invalid API key
 */
router.post('/change/email', validateApiKey, userController.changeEmail);

/**
 * @swagger
 * /user/delete:
 *   post:
 *     summary: Delete user account
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       401:
 *         description: Invalid API key
 */
router.post('/delete', validateApiKey, userController.deleteAccount);

module.exports = router;
