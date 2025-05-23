const db = require('../database');

exports.getAllUserData = (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
      console.error('Error querying database:', err.message);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    res.json({ success: true, users: rows });
  });
};


// Get user info - updated to use request body instead of query parameters
exports.getUserInfo = (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
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
};

// Get all emails
exports.getAllEmails = (req, res) => {
  db.all('SELECT email FROM users', [], (err, rows) => {
    if (err) {
      console.error('Error querying database:', err.message);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    
    const emails = rows.map(row => row.email);
    res.json({ 
      success: true, 
      emails: emails.filter((email, index, self) => self.indexOf(email) === index) 
    });
  });
};
