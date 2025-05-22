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
      
      res.json({ 
        success: true, 
        authenticated: passwordMatch,
        message: passwordMatch ? 'Authentication successful!' : 'Invalid password' 
      });
    } catch (error) {
      console.error('Error comparing passwords:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
};
