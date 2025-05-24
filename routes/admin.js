const express = require('express');
const router = express.Router();
const { validateApiKey } = require('../auth');
const adminController = require('../controllers/adminController');

router.post('/user', validateApiKey, adminController.getUserInfo);

router.get('/getAllUserData',validateApiKey, adminController.getAllUserData);

// Get all emails endpoint
router.get('/emails', validateApiKey, adminController.getAllEmails);

// User data management routes
router.post('/updateUser',validateApiKey, adminController.updateUser);
router.post('/deleteUser',validateApiKey, adminController.deleteUser);

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    res.json({
      success: true,
      token: process.env.API_KEY,
      username: username,
      message: 'Admin login successful'
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid admin credentials'
    });
  }
});

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
