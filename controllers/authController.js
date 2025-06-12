const authService = require('../services/authService');
const sessionService = require('../services/sessionService');
const logger = require('../utils/logger');

// Login user
exports.login = async (req, res) => {
  const { username, password } = req.body;
  
  logger.info(`Login attempt for username: ${username}`);
  
  if (!username || !password) {
    logger.warn('Login failed - Missing username or password');
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  try {
    // Authenticate user
    const authResult = await authService.authenticateUser(username, password);
    if (!authResult.success) {
      logger.warn(`Login failed - ${authResult.message} for user: ${username}`);
      return res.json({ success: false, authenticated: false, message: authResult.message });
    }

    const user = authResult.user;

    // Check active sessions count
    const activeSessions = await authService.getActiveSessionsCount(user.id);
    if (activeSessions >= 5) {
      logger.warn(`Login failed - Maximum sessions reached for user: ${username}`);
      return res.status(403).json({
        success: false,
        error: 'Maximum number of active sessions reached. Please logout from another device first.'
      });
    }

    const deviceId = authService.generateDeviceId(req);
    logger.info(`Login successful - User: ${username}, Device: ${deviceId}`);

    // Create session
    const sessionData = await authService.createSession(user, deviceId);

    res.json({ 
      success: true, 
      authenticated: true,
      message: 'Authentication successful',
      accessToken: sessionData.accessToken,
      refreshToken: sessionData.refreshToken,
      apiKey: process.env.API_KEY,
      deviceId: sessionData.deviceId,
      user: sessionData.user
    });
  } catch (error) {
    logger.error('Error during login:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Refresh access token
exports.refreshToken = async (req, res) => {
  const { refreshToken, deviceId } = req.body;
  
  logger.info(`Token refresh attempt for device: ${deviceId}`);
  
  if (!refreshToken || !deviceId) {
    logger.warn('Token refresh failed - Missing refresh token or device ID');
    return res.status(400).json({ success: false, error: 'Refresh token and device ID are required' });
  }

  try {
    const result = await authService.refreshTokens(refreshToken, deviceId);
    
    if (!result.success) {
      logger.warn(`Token refresh failed - ${result.message} for device: ${deviceId}`);
      return res.status(401).json({ success: false, error: result.message });
    }

    logger.info(`Token refreshed successfully for device: ${deviceId}`);
    res.json(result);
  } catch (error) {
    logger.error('Error during token refresh:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Logout user
exports.logout = async (req, res) => {
  const { deviceId, userId } = req.body;
  
  logger.info(`Logout attempt for user: ${userId}, device: ${deviceId}`);
  
  if (!deviceId || !userId) {
    logger.warn('Logout failed - Missing device ID or user ID');
    return res.status(400).json({ success: false, error: 'Device ID and User ID are required' });
  }

  try {
    await sessionService.logoutSession(deviceId, userId);
    logger.info(`User logged out successfully - User: ${userId}, Device: ${deviceId}`);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Error during logout:', error);
    res.status(500).json({ success: false, error: 'Failed to logout' });
  }
};

// Logout from all devices
exports.logoutAll = async (req, res) => {
  const { userId } = req.body;
  
  logger.info(`Logout from all devices attempt for user: ${userId}`);
  
  if (!userId) {
    logger.warn('Logout all failed - Missing user ID');
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  try {
    await sessionService.logoutAllSessions(userId);
    logger.info(`User logged out from all devices successfully - User: ${userId}`);
    res.json({ success: true, message: 'Logged out from all devices successfully' });
  } catch (error) {
    logger.error('Error during logout all:', error);
    res.status(500).json({ success: false, error: 'Failed to logout from all devices' });
  }
};

// List active sessions
exports.listSessions = async (req, res) => {
  const { userId } = req.body;
  
  logger.info(`Listing sessions for user: ${userId}`);
  
  if (!userId) {
    logger.warn('List sessions failed - Missing user ID');
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  try {
    const sessions = await sessionService.getUserSessions(userId);
    logger.info(`Sessions listed successfully for user: ${userId}, count: ${sessions.length}`);
    res.json({
      success: true,
      sessions: sessions
    });
  } catch (error) {
    logger.error('Error getting sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to get sessions' });
  }
};

// Check session status
exports.checkSession = async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    logger.warn('Session check failed - No token provided');
    return res.json({ 
      success: false, 
      isAuthenticated: false, 
      message: 'No token provided' 
    });
  }

  try {
    const result = await authService.validateSession(token);
    
    if (!result.success) {
      logger.warn(`Session check failed - ${result.message}`);
      return res.json({ 
        success: false, 
        isAuthenticated: false, 
        message: result.message 
      });
    }

    logger.info(`Session check successful for user: ${result.user.username}`);
    res.json({ 
      success: true, 
      isAuthenticated: true,
      message: 'Session is valid',
      deviceId: result.deviceId,
      user: result.user
    });
  } catch (error) {
    logger.error('Error during session check:', error);
    res.status(500).json({ 
      success: false, 
      isAuthenticated: false, 
      error: 'Internal server error' 
    });
  }
};
