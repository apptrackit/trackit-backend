const db = require('../database');
const bcrypt = require('bcrypt');

// Register a new user
exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  
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
};

// Change password
exports.changePassword = async (req, res) => {
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
};

// Change username
exports.changeUsername = async (req, res) => {
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
};

// Change email
exports.changeEmail = async (req, res) => {
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
};

// Delete account
exports.deleteAccount = async (req, res) => {
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
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    try {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, error: 'Password is incorrect' });
      }
      
      db.run('DELETE FROM users WHERE username = ?', 
        [username], 
        function(err) {
          if (err) {
            console.error('Error deleting account:', err.message);
            return res.status(500).json({ success: false, error: 'Database error' });
          }
          
          res.json({ success: true, message: 'Account deleted successfully' });
        }
      );
    } catch (error) {
      console.error('Error processing account deletion:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
};
