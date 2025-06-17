const userService = require('../services/userService');
const sessionService = require('../services/sessionService');
const hardwareService = require('../services/hardwareService');
const logger = require('../utils/logger');

exports.getAllUserData = async (req, res) => {
  logger.info('Admin request - Getting all user data');

  try {
    const users = await userService.getAllUsers();
    logger.info(`Admin - Retrieved ${users.length} users`);
    res.json({ success: true, users });
  } catch (error) {
    logger.error('Admin - Error querying all users:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
};

exports.getUserInfo = async (req, res) => {
  const { username } = req.body;

  logger.info(`Admin request - Getting user info for: ${username}`);

  if (!username) {
    logger.warn('Admin - Get user info failed - Missing username');
    return res.status(400).json({ success: false, error: 'Username is required' });
  }

  try {
    const user = await userService.getUserByUsername(username);
    if (!user) {
      logger.warn(`Admin - User not found: ${username}`);
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    logger.info(`Admin - Retrieved user info for: ${username}`);
    res.json({ ...user });
  } catch (error) {
    logger.error('Admin - Error querying user info:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
};

exports.getAllEmails = async (req, res) => {
  logger.info('Admin request - Getting all emails');

  try {
    const emails = await userService.getAllEmails();
    logger.info(`Admin - Retrieved ${emails.length} unique emails`);
    res.json({
      success: true,
      emails: emails
    });
  } catch (error) {
    logger.error('Admin - Error querying emails:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
};

exports.updateUser = async (req, res) => {
  const userData = req.body;
  
  logger.info(`Admin request - Updating user with ID: ${userData.id}`);
  
  if (!userData.id) {
    logger.warn('Admin - Update user failed - Missing user ID');
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  const { id, ...updateFields } = userData;

  try {
    const result = await userService.updateUser(id, updateFields);
    logger.info(`Admin - User updated successfully - ID: ${id}, changes: ${result.changes}`);
    res.json({
      success: true,
      message: 'User updated successfully',
      changes: result.changes
    });
  } catch (error) {
    logger.error('Admin - Error updating user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.body;

  logger.info(`Admin request - Deleting user with ID: ${id}`);

  if (!id) {
    logger.warn('Admin - Delete user failed - Missing user ID');
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  try {
    const result = await userService.deleteUser(id);
    logger.info(`Admin - User deleted successfully - ID: ${id}`);
    res.json({
      success: true,
      message: 'User deleted successfully',
      changes: result.changes
    });
  } catch (error) {
    logger.error('Admin - Error deleting user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createUser = async (req, res) => {
  const { username, email, password } = req.body;

  logger.info(`Admin request - Creating user: ${username}, email: ${email}`);

  if (!username || !email || !password) {
    logger.warn('Admin - Create user failed - Missing required fields');
    return res.status(400).json({ 
      success: false, 
      error: 'Username, email, and password are required' 
    });
  }

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    logger.warn(`Admin - Create user failed - Invalid email format: ${email}`);
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  try {
    const result = await userService.createUser(username, email, password);
    logger.info(`Admin - User created successfully: ${username}`);
    res.json({
      success: true,
      message: 'User created successfully',
      userId: result.id
    });
  } catch (error) {
    logger.error('Admin - Error creating user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getActiveUsers = async (req, res) => {
  const { range } = req.query;
  
  logger.info(`Admin request - Getting active users for range: ${range}`);
  
  const timeFilter = getTimeFilter(range);
  if (!timeFilter) {
    logger.warn(`Admin - Get active users failed - Invalid range: ${range}`);
    return res.status(400).json({ success: false, error: 'Invalid range parameter' });
  }

  try {
    const count = await sessionService.getActiveUsersCount(timeFilter);
    logger.info(`Admin - Active users retrieved - Range: ${range}, Count: ${count}`);
    res.json({
      success: true,
      count: count,
      range: range
    });
  } catch (error) {
    logger.error('Admin - Error getting active users:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
};

exports.getRegistrations = async (req, res) => {
  const { range } = req.query;
  
  logger.info(`Admin request - Getting registrations for range: ${range}`);
  
  const timeFilter = getTimeFilter(range);
  if (!timeFilter) {
    logger.warn(`Admin - Get registrations failed - Invalid range: ${range}`);
    return res.status(400).json({ success: false, error: 'Invalid range parameter' });
  }

  try {
    const count = await sessionService.getRegistrationsCount(timeFilter);
    logger.info(`Admin - Registrations retrieved - Range: ${range}, Count: ${count}`);
    res.json({
      success: true,
      count: count,
      range: range
    });
  } catch (error) {
    logger.error('Admin - Error getting registrations:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
};

exports.getHardwareInfo = async (req, res) => {
  logger.info('Admin request - Getting hardware info');
  
  try {
    const hardwareInfo = await hardwareService.getHardwareInfo();
    logger.info(`Admin - Hardware info retrieved - Temp: ${hardwareInfo.temperature.value}°C, Fan: ${hardwareInfo.fanSpeed.value}RPM`);
    res.json({
      success: true,
      hardware: hardwareInfo
    });
  } catch (error) {
    logger.error('Admin - Error getting hardware information:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get hardware information',
      details: error.message
    });
  }
};

exports.getEnvironmentInfo = async (req, res) => {
  logger.info('Admin request - Getting environment info');
  
  try {
    const nodeEnv = process.env.NODE_ENV;
    const isDevelopment = nodeEnv === 'dev' || nodeEnv === 'develop' || nodeEnv === 'development';
    
    res.json({ 
      success: true, 
      environment: isDevelopment ? 'development' : 'production',
      nodeEnv: nodeEnv || 'undefined'
    });
  } catch (error) {
    logger.error('Admin - Error getting environment info:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getUserSessions = async (req, res) => {
  const { userId } = req.body;
  
  logger.info(`Admin request - Getting sessions for user: ${userId}`);
  
  if (!userId) {
    logger.warn('Admin - Get user sessions failed - Missing userId');
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  try {
    const sessions = await sessionService.getUserSessions(userId);
    logger.info(`Admin - Retrieved ${sessions.length} sessions for user: ${userId}`);
    res.json({
      success: true,
      sessions: sessions
    });
  } catch (error) {
    logger.error('Admin - Error getting user sessions:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
};

exports.logoutUserSession = async (req, res) => {
  const { userId, deviceId } = req.body;
  
  logger.info(`Admin request - Logout user session for user: ${userId}, device: ${deviceId}`);
  
  if (!userId || !deviceId) {
    logger.warn('Admin - Logout user session failed - Missing userId or deviceId');
    return res.status(400).json({ success: false, error: 'User ID and Device ID are required' });
  }

  try {
    await sessionService.logoutSession(deviceId, userId);
    logger.info(`Admin - User session logged out successfully - User: ${userId}, Device: ${deviceId}`);
    res.json({ success: true, message: 'User session logged out successfully' });
  } catch (error) {
    logger.error('Admin - Error logging out user session:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
};

exports.logoutAllUserSessions = async (req, res) => {
  const { userId } = req.body;
  
  logger.info(`Admin request - Logout all sessions for user: ${userId}`);
  
  if (!userId) {
    logger.warn('Admin - Logout all user sessions failed - Missing userId');
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  try {
    await sessionService.logoutAllSessions(userId);
    logger.info(`Admin - All user sessions logged out successfully - User: ${userId}`);
    res.json({ success: true, message: 'All user sessions logged out successfully' });
  } catch (error) {
    logger.error('Admin - Error logging out all user sessions:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
};

// Helper function for time filtering
function getTimeFilter(range) {
  const now = new Date();
  switch(range) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}