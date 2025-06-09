const { db } = require('../database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Generate refresh token
const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Generate device ID
const generateDeviceId = (req) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip = req.ip || 'unknown';
  return crypto.createHash('sha256').update(`${userAgent}${ip}`).digest('hex');
};

// Get active sessions count for a user
const getActiveSessionsCount = (userId) => {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND refresh_token_expires_at > NOW()',
      [userId]
    )
    .then(result => {
      resolve(result.rows[0] ? result.rows[0].count : 0);
    })
    .catch(err => {
      reject(err);
    });
  });
};

// Login user
exports.login = async (req, res) => {
  const { username, password } = req.body;
  
  logger.info(`Login attempt for username: ${username}`);
  
  if (!username || !password) {
    logger.warn('Login failed - Missing username or password');
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  db.query('SELECT * FROM users WHERE username = $1', [username])
    .then(async result => {
      const user = result.rows[0];
      if (!user) {
        logger.warn(`Login failed - User not found: ${username}`);
        return res.json({ success: false, authenticated: false, message: 'User not found' });
      }
      
      try {
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
          logger.warn(`Login failed - Invalid password for user: ${username}`);
          return res.json({ 
            success: false, 
            authenticated: false,
            message: 'Invalid password' 
          });
        }

        // Check active sessions count
        const activeSessions = await getActiveSessionsCount(user.id);
        if (activeSessions >= 5) {
          logger.warn(`Login failed - Maximum sessions reached for user: ${username}`);
          return res.status(403).json({
            success: false,
            error: 'Maximum number of active sessions reached. Please logout from another device first.'
          });
        }

        const deviceId = generateDeviceId(req);
        logger.info(`Login successful - User: ${username}, Device: ${deviceId}`);

        // Create access token (7 days)
        const accessToken = jwt.sign(
          { userId: user.id, username: user.username, deviceId },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        // Create refresh token (365 days)
        const refreshToken = generateRefreshToken();

        // Calculate expiration dates
        const accessTokenExpiresAt = new Date();
        accessTokenExpiresAt.setDate(accessTokenExpiresAt.getDate() + 7);

        const refreshTokenExpiresAt = new Date();
        refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 365);

        // Store or update session in database using PostgreSQL ON CONFLICT
        db.query(
          `INSERT INTO sessions (user_id, device_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, device_id) DO UPDATE
           SET access_token = EXCLUDED.access_token,
               refresh_token = EXCLUDED.refresh_token,
               access_token_expires_at = EXCLUDED.access_token_expires_at,
               refresh_token_expires_at = EXCLUDED.refresh_token_expires_at,
               last_refresh_at = NOW(),
               refresh_count = sessions.refresh_count + 1
          `,
          [user.id, deviceId, accessToken, refreshToken, accessTokenExpiresAt.toISOString(), refreshTokenExpiresAt.toISOString()]
        )
        .then(() => {
          logger.info(`Session created/updated for user: ${username}, device: ${deviceId}`);
          res.json({ 
            success: true, 
            authenticated: true,
            message: 'Authentication successful',
            accessToken: accessToken,
            refreshToken: refreshToken,
            apiKey: process.env.API_KEY,
            deviceId: deviceId,
            user: {
              id: user.id,
              username: user.username,
              email: user.email
            }
          });
        })
        .catch(err => {
          logger.error('Error creating/updating session during login:', err);
          return res.status(500).json({ success: false, error: 'Failed to create session' });
        });
      } catch (error) {
        logger.error('Error comparing passwords during login:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    })
    .catch(err => {
      logger.error('Error querying user during login:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    });
};

// Refresh access token
exports.refreshToken = async (req, res) => {
  const { refreshToken, deviceId } = req.body;
  
  logger.info(`Token refresh attempt for device: ${deviceId}`);
  
  if (!refreshToken || !deviceId) {
    logger.warn('Token refresh failed - Missing refresh token or device ID');
    return res.status(400).json({ success: false, error: 'Refresh token and device ID are required' });
  }

  db.query(
    'SELECT * FROM sessions WHERE refresh_token = $1 AND device_id = $2 AND refresh_token_expires_at > NOW()',
    [refreshToken, deviceId]
  )
  .then(async result => {
    const session = result.rows[0];
    if (!session) {
      logger.warn(`Token refresh failed - Invalid or expired refresh token for device: ${deviceId}`);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired refresh token' 
      });
    }

    db.query('SELECT * FROM users WHERE id = $1', [session.user_id])
      .then(userResult => {
        const user = userResult.rows[0];
        logger.info(`Token refreshed successfully for user: ${user.username}, device: ${deviceId}`);

        // Create new access token
        const newAccessToken = jwt.sign(
          { userId: user.id, username: user.username, deviceId: session.device_id },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        // Generate new refresh token
        const newRefreshToken = generateRefreshToken();

        // Calculate new expiration dates
        const newAccessTokenExpiresAt = new Date();
        newAccessTokenExpiresAt.setDate(newAccessTokenExpiresAt.getDate() + 7);

        const newRefreshTokenExpiresAt = new Date();
        newRefreshTokenExpiresAt.setDate(newRefreshTokenExpiresAt.getDate() + 365);

        // Update session with new tokens
        db.query(
          'UPDATE sessions SET access_token = $1, refresh_token = $2, access_token_expires_at = $3, refresh_token_expires_at = $4, last_refresh_at = NOW(), refresh_count = refresh_count + 1 WHERE id = $5',
          [newAccessToken, newRefreshToken, newAccessTokenExpiresAt.toISOString(), newRefreshTokenExpiresAt.toISOString(), session.id]
        )
        .then(() => {
          res.json({
            success: true,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            deviceId: session.device_id
          });
        })
        .catch(err => {
          logger.error('Error updating tokens during refresh:', err);
          return res.status(500).json({ success: false, error: 'Failed to refresh tokens' });
        });
      })
      .catch(err => {
        logger.error('Error getting user during token refresh:', err);
        return res.status(500).json({ success: false, error: 'Database error' });
      });
  })
  .catch(err => {
    logger.error('Error checking refresh token:', err);
    return res.status(500).json({ success: false, error: 'Database error' });
  });
};

// Logout user
exports.logout = async (req, res) => {
  const { deviceId, userId } = req.body;
  
  logger.info(`Logout attempt for user: ${userId}, device: ${deviceId}`);
  
  if (!deviceId || !userId) {
    logger.warn('Logout failed - Missing device ID or user ID');
    return res.status(400).json({ success: false, error: 'Device ID and User ID are required' });
  }

  db.query('DELETE FROM sessions WHERE device_id = $1 AND user_id = $2', [deviceId, userId])
    .then(() => {
      logger.info(`User logged out successfully - User: ${userId}, Device: ${deviceId}`);
      res.json({ success: true, message: 'Logged out successfully' });
    })
    .catch(err => {
      logger.error('Error deleting session during logout:', err);
      return res.status(500).json({ success: false, error: 'Failed to logout' });
    });
};

// Logout from all devices
exports.logoutAll = async (req, res) => {
  const { userId } = req.body;
  
  logger.info(`Logout from all devices attempt for user: ${userId}`);
  
  if (!userId) {
    logger.warn('Logout all failed - Missing user ID');
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  db.query('DELETE FROM sessions WHERE user_id = $1', [userId])
    .then(() => {
      logger.info(`User logged out from all devices successfully - User: ${userId}`);
      res.json({ success: true, message: 'Logged out from all devices successfully' });
    })
    .catch(err => {
      logger.error('Error deleting all sessions during logout:', err);
      return res.status(500).json({ success: false, error: 'Failed to logout from all devices' });
    });
};

// List active sessions
exports.listSessions = async (req, res) => {
  const { userId } = req.body;
  
  logger.info(`Listing sessions for user: ${userId}`);
  
  if (!userId) {
    logger.warn('List sessions failed - Missing user ID');
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  db.query(
    'SELECT id, device_id, created_at, last_refresh_at, last_check_at, refresh_count FROM sessions WHERE user_id = $1 AND refresh_token_expires_at > NOW()',
    [userId]
  )
  .then(result => {
    logger.info(`Sessions listed successfully for user: ${userId}, count: ${result.rows.length}`);
    res.json({
      success: true,
      sessions: result.rows
    });
  })
  .catch(err => {
    logger.error('Error getting sessions:', err);
    return res.status(500).json({ success: false, error: 'Failed to get sessions' });
  });
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
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    db.query('SELECT * FROM sessions WHERE access_token = $1 AND device_id = $2 AND access_token_expires_at > NOW()', 
      [token, decoded.deviceId]
    )
    .then(result =>  {
      const session = result.rows[0];
      if (!session) {
        logger.warn(`Session check failed - Session expired or invalid for user: ${decoded.userId}`);
        return res.json({ 
          success: false, 
          isAuthenticated: false, 
          message: 'Session expired or invalid' 
        });
      }

      db.query('UPDATE sessions SET last_check_at = NOW() WHERE id = $1', [session.id])
        .catch(err => {
          logger.error('Error updating last_check_at:', err);
        });
        
      db.query('SELECT id, username, email FROM users WHERE id = $1', 
        [decoded.userId]
      )
      .then(userResult => {
        const user = userResult.rows[0];
        if (!user) {
          logger.error(`Session check failed - User not found: ${decoded.userId}`);
          return res.status(500).json({ 
            success: false, 
            isAuthenticated: false, 
            error: 'Internal server error' 
          });
        }

        logger.info(`Session check successful for user: ${user.username}`);
        res.json({ 
          success: true, 
          isAuthenticated: true,
          message: 'Session is valid',
          deviceId: session.device_id,
          user: user
        });
      })
      .catch(err => {
        logger.error('Error getting user info during session check:', err);
        return res.status(500).json({ 
          success: false, 
          isAuthenticated: false, 
          error: 'Internal server error' 
        });
      });
    })
    .catch(err => {
      logger.error('Error checking session in database:', err);
      return res.status(500).json({ 
        success: false, 
        isAuthenticated: false, 
        error: 'Internal server error' 
      });
    });
  } catch (error) {
    logger.warn('Session check failed - Invalid token');
    return res.json({ 
      success: false, 
      isAuthenticated: false, 
      message: 'Invalid token' 
    });
  }
};
