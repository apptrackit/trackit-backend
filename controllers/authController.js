const db = require('../database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

      // Create JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Calculate expiration date (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Store session in database
      db.run(
        'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, token, expiresAt.toISOString()],
        function(err) {
          if (err) {
            console.error('Error creating session:', err);
            return res.status(500).json({ success: false, error: 'Failed to create session' });
          }

          res.json({ 
            success: true, 
            authenticated: true,
            message: 'Authentication successful',
            token: token,
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

// Logout user
exports.logout = async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(400).json({ success: false, error: 'No token provided' });
  }

  db.run('DELETE FROM sessions WHERE token = ?', [token], function(err) {
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
    db.get('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")', 
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
