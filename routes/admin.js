const express = require('express');
const router = express.Router();
const { validateAdminApiKey } = require('../auth');
const adminController = require('../controllers/adminController');

router.post('/user', validateAdminApiKey, adminController.getUserInfo);

router.get('/getAllUserData', validateAdminApiKey, adminController.getAllUserData);

// Get all emails endpoint
router.get('/emails', validateAdminApiKey, adminController.getAllEmails);

// User data management routes
router.post('/updateUser', validateAdminApiKey, adminController.updateUser);
router.post('/deleteUser', validateAdminApiKey, adminController.deleteUser);
router.post('/createUser', validateAdminApiKey, adminController.createUser);

//New stats endpoints
router.get('/registrations', validateAdminApiKey, adminController.getRegistrations);
router.get('/active-users', validateAdminApiKey, adminController.getActiveUsers);

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    res.json({
      success: true,
      adminApiKey: process.env.ADMIN_API_KEY,
      apiKey: process.env.API_KEY,
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

// Hardware information endpoint
router.get('/hardwareinfo', validateAdminApiKey, adminController.getHardwareInfo);

module.exports = router;