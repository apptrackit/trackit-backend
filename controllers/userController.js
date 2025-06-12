const authService = require('../services/authService');
const userService = require('../services/userService');
const logger = require('../utils/logger');

// Register a new user
exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  
  logger.info(`Registration attempt for username: ${username}, email: ${email}`);
  
  // Validate email format
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    logger.warn(`Registration failed - Invalid email format: ${email}`);
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }
  
  try {
    // Check if user already exists
    const existingUser = await userService.getUserByUsername(username);
    if (existingUser) {
      logger.warn(`Registration failed - Username already exists: ${username}`);
      return res.status(409).json({ success: false, error: 'Username already exists' });
    }

    // Create user
    const newUser = await userService.createUser(username, email, password);
    logger.info(`User registered successfully - ID: ${newUser.id}, username: ${username}`);

    // Create session for the new user
    const deviceId = authService.generateDeviceId(req);
    const sessionData = await authService.createSession(newUser, deviceId);

    res.status(201).json({ 
      success: true, 
      authenticated: true,
      message: 'Registration successful',
      accessToken: sessionData.accessToken,
      refreshToken: sessionData.refreshToken,
      apiKey: process.env.API_KEY,
      deviceId: sessionData.deviceId,
      user: sessionData.user
    });
  } catch (error) {
    logger.error('Error during registration:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  
  logger.info(`Password change attempt for username: ${username}`);
  
  if (!username || !oldPassword || !newPassword) {
    logger.warn('Password change failed - Missing required fields');
    return res.status(400).json({ success: false, error: 'Username, old password, and new password are required' });
  }

  try {
    await userService.changePassword(username, oldPassword, newPassword);
    logger.info(`Password updated successfully for user: ${username}`);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Error during password change:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message === 'Current password is incorrect') {
      return res.status(401).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Change username
exports.changeUsername = async (req, res) => {
  const { oldUsername, newUsername, password } = req.body;
  
  logger.info(`Username change attempt from: ${oldUsername} to: ${newUsername}`);
  
  if (!oldUsername || !newUsername || !password) {
    logger.warn('Username change failed - Missing required fields');
    return res.status(400).json({ success: false, error: 'Current username, new username, and password are required' });
  }
  
  try {
    await userService.changeUsername(oldUsername, newUsername, password);
    logger.info(`Username updated successfully from: ${oldUsername} to: ${newUsername}`);
    res.json({ success: true, message: 'Username updated successfully' });
  } catch (error) {
    logger.error('Error during username change:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message === 'Password is incorrect') {
      return res.status(401).json({ success: false, error: error.message });
    }
    if (error.message === 'Username already exists') {
      return res.status(409).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Change email
exports.changeEmail = async (req, res) => {
  const { username, newEmail, password } = req.body;
  
  logger.info(`Email change attempt for username: ${username} to: ${newEmail}`);
  
  if (!username || !newEmail || !password) {
    logger.warn('Email change failed - Missing required fields');
    return res.status(400).json({ success: false, error: 'Username, new email, and password are required' });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    logger.warn(`Email change failed - Invalid email format: ${newEmail}`);
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }
  
  try {
    await userService.changeEmail(username, newEmail, password);
    logger.info(`Email updated successfully for user: ${username} to: ${newEmail}`);
    res.json({ success: true, message: 'Email updated successfully' });
  } catch (error) {
    logger.error('Error during email change:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message === 'Password is incorrect') {
      return res.status(401).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Delete account
exports.deleteAccount = async (req, res) => {
  const { username, password } = req.body;
  
  logger.info(`Account deletion attempt for username: ${username}`);
  
  if (!username || !password) {
    logger.warn('Account deletion failed - Missing required fields');
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  try {
    await userService.deleteAccount(username, password);
    logger.info(`Account deleted successfully for user: ${username}`);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Error during account deletion:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message === 'Password is incorrect') {
      return res.status(401).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
