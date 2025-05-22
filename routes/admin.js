const express = require('express');
const router = express.Router();
const { validateApiKey } = require('../auth');
const adminController = require('../controllers/adminController');

// Admin endpoint to get user info - changed from GET to POST
router.post('/user', validateApiKey, adminController.getUserInfo);

// Get all emails endpoint
router.get('/emails', validateApiKey, adminController.getAllEmails);

module.exports = router;
