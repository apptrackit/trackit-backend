const express = require('express');
const db = require('./database');
const { validateApiKey } = require('./auth');
const bcrypt = require('bcrypt');
const app = express();
require('dotenv').config();

app.use(express.json());

app.get('/', (req, res) => {
  const apiDocs = {
    name: "TrackIt API",
    version: "1.0.0",
    description: "API for user management in the TrackIt application",
    baseUrl: `http://localhost:${process.env.PORT}`,
    endpoints: [
      {
        path: "/register",
        method: "POST",
        description: "Register a new user",
        parameters: {
          username: "Username for the new account",
          email: "Valid email address",
          password: "Password for the account"
        },
        authentication: "API key required",
        example: {
          request: {
            body: {
              username: "johndoe",
              email: "john@example.com",
              password: "securepassword"
            }
          },
          response: {
            success: true,
            id: 1
          }
        }
      },
      {
        path: "/login",
        method: "POST",
        description: "Authenticate a user",
        parameters: {
          username: "Username of the account",
          password: "Password for the account"
        },
        authentication: "API key required",
        example: {
          request: {
            body: {
              username: "johndoe",
              password: "securepassword"
            }
          },
          response: {
            success: true,
            authenticated: true,
            message: "Authentication successful"
          }
        }
      },
      {
        path: "/change/password",
        method: "POST",
        description: "Change user password",
        parameters: {
          username: "Username of the account",
          oldPassword: "Current password",
          newPassword: "New password to set"
        },
        authentication: "API key required",
        example: {
          request: {
            body: {
              username: "johndoe",
              oldPassword: "oldpassword",
              newPassword: "newpassword"
            }
          },
          response: {
            success: true,
            message: "Password updated successfully"
          }
        }
      },
      {
        path: "/change/username",
        method: "POST",
        description: "Change username",
        parameters: {
          oldUsername: "Current username",
          newUsername: "New username to set",
          password: "Current password for verification"
        },
        authentication: "API key required",
        example: {
          request: {
            body: {
              oldUsername: "johndoe",
              newUsername: "johndoe2",
              password: "securepassword"
            }
          },
          response: {
            success: true,
            message: "Username updated successfully"
          }
        }
      },
      {
        path: "/change/email",
        method: "POST",
        description: "Change email address",
        parameters: {
          username: "Username of the account",
          newEmail: "New email address",
          password: "Current password for verification"
        },
        authentication: "API key required",
        example: {
          request: {
            body: {
              username: "johndoe",
              newEmail: "newemail@example.com",
              password: "securepassword"
            }
          },
          response: {
            success: true,
            message: "Email updated successfully"
          }
        }
      },
      {
        path: "/admin",
        method: "GET",
        description: "Get complete user information (admin only)",
        parameters: {
          username: "Username to look up (query parameter)"
        },
        authentication: "API key required",
        example: {
          request: {
            url: "/admin?username=johndoe"
          },
          response: {
            id: 1,
            username: "johndoe",
            email: "john@example.com",
            password: "[hashed password]"
          }
        }
      }
    ],
    authentication: {
      type: "API Key",
      methods: [
        {
          location: "Header",
          name: "x-api-key"
        },
        {
          location: "Query parameter",
          name: "apiKey"
        }
      ]
    },
    note: "All endpoints return a 'success' flag (true/false) to indicate whether the operation was successful"
  };

  res.json(apiDocs);
});

// Register a new user
app.post('/register', validateApiKey, async (req, res) => {
  const { username, email, password } = req.body;

  console.log('Request body:', req.body);
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }
  
  try {
    const saltRounds = parseInt(process.env.SALT);
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    db.get('SELECT username FROM users WHERE username = ?', [username], (err, row) => {
      if (err) {
        console.error('Error checking username:', err.message);
        return res.status(500).json({ success: false, error: 'Database error' });
      }
      
      if (row) {
        return res.status(409).json({ success: false, error: 'Username already exists' });
      }
      
      db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
        [username, email, hashedPassword], 
        function(err) {
          if (err) {
            console.error('Error inserting into database:', err.message);
            return res.status(500).json({ success: false, error: 'Database error' });
          }
          res.status(201).json({ success: true, id: this.lastID });
        }
      );
    });
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/login', validateApiKey, (req, res) => {
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
      
      res.json({ 
        success: true, 
        authenticated: passwordMatch,
        message: passwordMatch ? 'Authentication successful' : 'Invalid password' 
      });
    } catch (error) {
      console.error('Error comparing passwords:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
});

// Change password endpoint
app.post('/change/password', validateApiKey, (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  
  if (!username || !oldPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Username, old password, and new password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      console.error('Error querying database:', err.message);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    try {
      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
      
      if (!isOldPasswordValid) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }
      
      const saltRounds = parseInt(process.env.SALT);
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      
      db.run('UPDATE users SET password = ? WHERE username = ?', 
        [hashedNewPassword, username], 
        function(err) {
          if (err) {
            console.error('Error updating password:', err.message);
            return res.status(500).json({ success: false, error: 'Database error' });
          }
          
          res.json({ success: true, message: 'Password updated successfully' });
        }
      );
    } catch (error) {
      console.error('Error processing password change:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
});

// Change username endpoint
app.post('/change/username', validateApiKey, (req, res) => {
  const { oldUsername, newUsername, password } = req.body;
  
  if (!oldUsername || !newUsername || !password) {
    return res.status(400).json({ success: false, error: 'Current username, new username, and password are required' });
  }
  
  db.get('SELECT * FROM users WHERE username = ?', [oldUsername], async (err, user) => {
    if (err) {
      console.error('Error querying database:', err.message);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    try {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, error: 'Password is incorrect' });
      }
      
      db.get('SELECT username FROM users WHERE username = ?', [newUsername], (err, existingUser) => {
        if (err) {
          console.error('Error checking username:', err.message);
          return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        if (existingUser) {
          return res.status(409).json({ success: false, error: 'Username already exists' });
        }
        
        db.run('UPDATE users SET username = ? WHERE username = ?', 
          [newUsername, oldUsername], 
          function(err) {
            if (err) {
              console.error('Error updating username:', err.message);
              return res.status(500).json({ success: false, error: 'Database error' });
            }
            
            res.json({ success: true, message: 'Username updated successfully' });
          }
        );
      });
    } catch (error) {
      console.error('Error processing username change:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
});

// Change email endpoint
app.post('/change/email', validateApiKey, (req, res) => {
  const { username, newEmail, password } = req.body;
  
  if (!username || !newEmail || !password) {
    return res.status(400).json({ success: false, error: 'Username, new email, and password are required' });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      console.error('Error querying database:', err.message);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    try {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, error: 'Password is incorrect' });
      }
      
      db.run('UPDATE users SET email = ? WHERE username = ?', 
        [newEmail, username], 
        function(err) {
          if (err) {
            console.error('Error updating email:', err.message);
            return res.status(500).json({ success: false, error: 'Database error' });
          }
          
          res.json({ success: true, message: 'Email updated successfully' });
        }
      );
    } catch (error) {
      console.error('Error processing email change:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
});

// Admin endpoint to get all user info by username
app.get('/admin', validateApiKey, (req, res) => {
  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ success: false, error: 'Username parameter is required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('Error querying database:', err.message);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Return user data directly with success flag
    res.json({ ...user });
  });
});

app.listen(process.env.PORT, process.env.HOST, () => {
  console.log(`Server running on http://${process.env.HOST}:${process.env.PORT}`);
});