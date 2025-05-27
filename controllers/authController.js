const db = require('../database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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
    db.get(
      'SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND refresh_token_expires_at > datetime("now")',
      [userId],
      (err, row) => {
        if (err) reject(err);
        resolve(row ? row.count : 0);
      }
    );
  });
};

// Login user
exports.login = async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      console.error('Error querying database:', err.message);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    
    if (!user) {
      return res.json({ success: false, authenticated: false, message: 'User not found' });
    }
    
    try {
      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        return res.json({ 
          success: false, 
          authenticated: false,
          message: 'Invalid password' 
        });
      }

      // Check active sessions count
      const activeSessions = await getActiveSessionsCount(user.id);
      if (activeSessions >= 5) {
        return res.status(403).json({
          success: false,
          error: 'Maximum number of active sessions reached. Please logout from another device first.'
        });
      }

      const deviceId = generateDeviceId(req);

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

      // Store session in database
      db.run(
        'INSERT OR REPLACE INTO sessions (user_id, device_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        [user.id, deviceId, accessToken, refreshToken, accessTokenExpiresAt.toISOString(), refreshTokenExpiresAt.toISOString()],
        function(err) {
          if (err) {
            console.error('Error creating session:', err);
            return res.status(500).json({ success: false, error: 'Failed to create session' });
          }

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
        }
      );
    } catch (error) {
      console.error('Error comparing passwords:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
};

// Refresh access token
exports.refreshToken = async (req, res) => {
  const { refreshToken, deviceId } = req.body;
  
  if (!refreshToken || !deviceId) {
    return res.status(400).json({ success: false, error: 'Refresh token and device ID are required' });
  }

  // Check if refresh token exists and is not expired
  db.get(
    'SELECT * FROM sessions WHERE refresh_token = ? AND device_id = ? AND refresh_token_expires_at > datetime("now")',
    [refreshToken, deviceId],
    async (err, session) => {
      if (err) {
        console.error('Error checking refresh token:', err);
        return res.status(500).json({ success: false, error: 'Database error' });
      }

      if (!session) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid or expired refresh token' 
        });
      }

      // Get user info
      db.get('SELECT * FROM users WHERE id = ?', [session.user_id], (err, user) => {
        if (err) {
          console.error('Error getting user:', err);
          return res.status(500).json({ success: false, error: 'Database error' });
        }

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
        db.run(
          'UPDATE sessions SET access_token = ?, refresh_token = ?, access_token_expires_at = ?, refresh_token_expires_at = ?, last_refresh_at = datetime("now"), refresh_count = refresh_count + 1 WHERE id = ?',
          [newAccessToken, newRefreshToken, newAccessTokenExpiresAt.toISOString(), newRefreshTokenExpiresAt.toISOString(), session.id],
          function(err) {
            if (err) {
              console.error('Error updating tokens:', err);
              return res.status(500).json({ success: false, error: 'Failed to refresh tokens' });
            }

            res.json({
              success: true,
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
              deviceId: session.device_id
            });
          }
        );
      });
    }
  );
};

// Logout user
exports.logout = async (req, res) => {
  const { deviceId, userId } = req.body;
  
  if (!deviceId || !userId) {
    return res.status(400).json({ success: false, error: 'Device ID and User ID are required' });
  }

  db.run('DELETE FROM sessions WHERE device_id = ? AND user_id = ?', [deviceId, userId], function(err) {
    if (err) {
      console.error('Error deleting session:', err);
      return res.status(500).json({ success: false, error: 'Failed to logout' });
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  });
};

// Logout from all devices
exports.logoutAll = async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  db.run('DELETE FROM sessions WHERE user_id = ?', [userId], function(err) {
    if (err) {
      console.error('Error deleting sessions:', err);
      return res.status(500).json({ success: false, error: 'Failed to logout from all devices' });
    }

    res.json({ success: true, message: 'Logged out from all devices successfully' });
  });
};

// List active sessions
exports.listSessions = async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  db.all(
    'SELECT id, device_id, created_at, last_refresh_at, last_check_at, refresh_count FROM sessions WHERE user_id = ? AND refresh_token_expires_at > datetime("now")',
    [userId],
    (err, sessions) => {
      if (err) {
        console.error('Error getting sessions:', err);
        return res.status(500).json({ success: false, error: 'Failed to get sessions' });
      }

      res.json({
        success: true,
        sessions: sessions
      });
    }
  );
};

// Check session status
exports.checkSession = async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.json({ 
      success: false, 
      isAuthenticated: false, 
      message: 'No token provided' 
    });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token exists in database and is not expired
    db.get('SELECT * FROM sessions WHERE access_token = ? AND device_id = ? AND access_token_expires_at > datetime("now")', 
      [token, decoded.deviceId], 
      (err, session) => {
        if (err) {
          console.error('Error checking session:', err);
          return res.status(500).json({ 
            success: false, 
            isAuthenticated: false, 
            error: 'Internal server error' 
          });
        }
        
        if (!session) {
          return res.json({ 
            success: false, 
            isAuthenticated: false, 
            message: 'Session expired or invalid' 
          });
        }

        // Update last_check_at timestamp
        db.run('UPDATE sessions SET last_check_at = datetime("now") WHERE id = ?', [session.id], (err) => {
          if (err) {
            console.error('Error updating last_check_at:', err);
          }
        });
        
        // Get user info
        db.get('SELECT id, username, email FROM users WHERE id = ?', 
          [decoded.userId], 
          (err, user) => {
            if (err) {
              console.error('Error getting user info:', err);
              return res.status(500).json({ 
                success: false, 
                isAuthenticated: false, 
                error: 'Internal server error' 
              });
            }

            res.json({ 
              success: true, 
              isAuthenticated: true,
              message: 'Session is valid',
              deviceId: session.device_id,
              user: user
            });
          }
        );
      }
    );
  } catch (error) {
    return res.json({ 
      success: false, 
      isAuthenticated: false, 
      message: 'Invalid token' 
    });
  }
};
