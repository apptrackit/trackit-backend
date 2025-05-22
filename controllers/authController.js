const db = require('../database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate refresh token
const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
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

      // Create access token (7 days)
      const accessToken = jwt.sign(
        { userId: user.id, username: user.username },
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
        'INSERT INTO sessions (user_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at) VALUES (?, ?, ?, ?, ?)',
        [user.id, accessToken, refreshToken, accessTokenExpiresAt.toISOString(), refreshTokenExpiresAt.toISOString()],
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
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'Refresh token is required' });
  }

  // Check if refresh token exists and is not expired
  db.get(
    'SELECT * FROM sessions WHERE refresh_token = ? AND refresh_token_expires_at > datetime("now")',
    [refreshToken],
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
          { userId: user.id, username: user.username },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        // Update access token in database
        const newAccessTokenExpiresAt = new Date();
        newAccessTokenExpiresAt.setDate(newAccessTokenExpiresAt.getDate() + 7);

        db.run(
          'UPDATE sessions SET access_token = ?, access_token_expires_at = ? WHERE refresh_token = ?',
          [newAccessToken, newAccessTokenExpiresAt.toISOString(), refreshToken],
          function(err) {
            if (err) {
              console.error('Error updating access token:', err);
              return res.status(500).json({ success: false, error: 'Failed to refresh token' });
            }

            res.json({
              success: true,
              accessToken: newAccessToken
            });
          }
        );
      });
    }
  );
};

// Logout user
exports.logout = async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(400).json({ success: false, error: 'No token provided' });
  }

  db.run('DELETE FROM sessions WHERE access_token = ?', [token], function(err) {
    if (err) {
      console.error('Error deleting session:', err);
      return res.status(500).json({ success: false, error: 'Failed to logout' });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  });
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
    db.get('SELECT * FROM sessions WHERE access_token = ? AND access_token_expires_at > datetime("now")', 
      [token], 
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
