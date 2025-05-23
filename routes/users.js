
const express = require('express');
const router = express.Router();
const { validateApiKey } = require('../auth');
const userController = require('../controllers/userController');

// Register a new user
router.post('/register', validateApiKey, userController.register);

// Change password endpoint
router.post('/change/password', validateApiKey, userController.changePassword);

// Change username endpoint
router.post('/change/username', validateApiKey, userController.changeUsername);

// Change email endpoint
router.post('/change/email', validateApiKey, userController.changeEmail);

// Delete account endpoint
router.post('/delete', validateApiKey, userController.deleteAccount);

module.exports = router;
