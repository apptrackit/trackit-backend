const db = require('../database');
const bcrypt = require('bcrypt');
require('dotenv').config();
const saltRounds = parseInt(process.env.SALT_ROUNDS);
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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

// New function to update user data
exports.updateUser = (req, res) => {

  const userData = req.body;
  if (!userData.id) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }
  const { id, ...updateFields } = userData;

  // Helper to run the update query
  const processUpdate = () => {
    const fields = Object.keys(updateFields);
    const values = Object.values(updateFields);
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE users SET ${setClause} WHERE id = ?`;
    values.push(id);
    db.run(sql, values, function(err) {
      if (err) {
        console.error('Error updating user:', err.message);
        return res.status(500).json({ success: false, error: 'Database error: ' + err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, error: 'User not found or no changes made' });
      }
      res.json({
        success: true,
        message: 'User updated successfully',
        changes: this.changes
      });
    });
  };

  // Password hashing logic
  if (updateFields.password) {
    bcrypt.hash(updateFields.password, saltRounds, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({ success: false, error: 'Password hashing failed' });
      }
      updateFields.password = hash;
      processUpdate();
    });
  } else if (updateFields.passwordHash) {
    bcrypt.hash(updateFields.passwordHash, saltRounds, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({ success: false, error: 'Password hashing failed' });
      }
      updateFields.passwordHash = hash;
      processUpdate();
    });
  } else if (updateFields.password_hash) {
    bcrypt.hash(updateFields.password_hash, saltRounds, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({ success: false, error: 'Password hashing failed' });
      }
      updateFields.password_hash = hash;
      processUpdate();
    });
  } else {
    processUpdate();
  }
};

// New function to delete a user
exports.deleteUser = (req, res) => {

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  const sql = 'DELETE FROM users WHERE id = ?';

  console.log('Executing delete SQL:', sql); // Log the SQL for debugging
  console.log('With ID:', id); // Log the ID

  db.run(sql, [id], function(err) {
    if (err) {
      console.error('Error deleting user:', err.message);
      return res.status(500).json({ success: false, error: 'Database error: ' + err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      changes: this.changes
    });
  });
};

exports.createUser = (req, res) => {
  const { username, email, password } = req.body;

  // Validate required fields
  if (!username || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Username, email, and password are required' 
    });
  }

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  // Check if username or email already exists
  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, existingUser) => {
    if (err) {
      console.error('Error checking existing user:', err.message);
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username or email already exists' 
      });
    }

    // Hash the password
    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({ success: false, error: 'Password hashing failed' });
      }

      // Insert new user
      const sql = `
        INSERT INTO users (username, email, password)
        VALUES (?, ?, ?)
      `;

      db.run(sql, [username, email, hashedPassword], function(err) {
        if (err) {
          console.error('Error creating user:', err.message);
          return res.status(500).json({ success: false, error: 'Database error' });
        }

        res.json({
          success: true,
          message: 'User created successfully',
          userId: this.lastID
        });
      });
    });
  });
};
// ... existing code ...

exports.getActiveUsers = (req, res) => {
  const { range } = req.query;
  let timeFilter;
  
  const now = new Date();
  switch(range) {
    case '24h':
      timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      timeFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      timeFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      return res.status(400).json({ success: false, error: 'Invalid range parameter' });
  }

  const sql = `
    SELECT COUNT(DISTINCT user_id) as count 
    FROM sessions 
    WHERE datetime(last_check_at) >= datetime(?)
  `;

  db.get(sql, [timeFilter.toISOString()], (err, row) => {
    if (err) {
      console.error('Error getting active users:', err.message);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    res.json({
      success: true,
      count: row ? row.count : 0,
      range: range
    });
  });
};

exports.getRegistrations = (req, res) => {
  const { range } = req.query;
  let timeFilter;
  
  const now = new Date();
  switch(range) {
    case '24h':
      timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      timeFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      timeFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      return res.status(400).json({ success: false, error: 'Invalid range parameter' });
  }

  const sql = `
    SELECT COUNT(*) as count 
    FROM users 
    WHERE datetime(created_at) >= datetime(?)
  `;

  db.get(sql, [timeFilter.toISOString()], (err, row) => {
    if (err) {
      console.error('Error getting registrations:', err.message);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    res.json({
      success: true,
      count: row ? row.count : 0,
      range: range
    });
  });
};

exports.getHardwareInfo = async (req, res) => {
  try {
    // Get temperature and fan speed
    const { stdout: sensorsOutput } = await execPromise('sensors');
    
    // Parse temperature - looking for any temperature sensor
    const tempMatch = sensorsOutput.match(/Core\s+\d+:\s+\+(\d+\.\d+)°C/);
    let temp = 0;
    if (tempMatch) {
      temp = parseFloat(tempMatch[1]);
    }

    // Parse fan speed - looking for any fan sensor
    const fanMatch = sensorsOutput.match(/fan\d+:\s+(\d+)\s+RPM/);
    let fan = 0;
    if (fanMatch) {
      fan = parseInt(fanMatch[1]);
    }

    // Get uptime
    const { stdout: uptimeOutput } = await execPromise('uptime -p');
    const uptime = uptimeOutput.trim().replace('up ', '');

    // Determine temperature color
    let tempColor;
    if (temp >= 80) {
      tempColor = 'red';
    } else if (temp >= 60) {
      tempColor = 'orange';
    } else if (temp >= 40) {
      tempColor = 'green';
    } else {
      tempColor = 'blue';
    }

    // Determine fan speed color
    let fanColor;
    if (fan >= 4000) {
      fanColor = 'red';
    } else if (fan >= 2500) {
      fanColor = 'orange';
    } else if (fan >= 1500) {
      fanColor = 'green';
    } else {
      fanColor = 'blue';
    }

    // Log the raw sensor output for debugging
    console.log('Raw sensors output:', sensorsOutput);

    res.json({
      success: true,
      hardware: {
        temperature: {
          value: temp,
          color: tempColor,
          raw: sensorsOutput // Including raw output for debugging
        },
        fanSpeed: {
          value: fan,
          color: fanColor
        },
        uptime: uptime
      }
    });
  } catch (error) {
    console.error('Error getting hardware info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get hardware information',
      details: error.message
    });
  }
};