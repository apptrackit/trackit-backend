const { db } = require('../database');
const bcrypt = require('bcrypt');
require('dotenv').config();
const saltRounds = parseInt(process.env.SALT_ROUNDS);
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const logger = require('../utils/logger');

exports.getAllUserData = (req, res) => {
  logger.info('Admin request - Getting all user data');

  db.query('SELECT * FROM users')
    .then(result => {
      logger.info(`Admin - Retrieved ${result.rows.length} users`);
      res.json({ success: true, users: result.rows });
    })
    .catch(err => {
      logger.error('Admin - Error querying all users:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    });
};

// Get user info - updated to use request body instead of query parameters
exports.getUserInfo = (req, res) => {
  const { username } = req.body;

  logger.info(`Admin request - Getting user info for: ${username}`);

  if (!username) {
    logger.warn('Admin - Get user info failed - Missing username');
    return res.status(400).json({ success: false, error: 'Username is required' });
  }

  db.query('SELECT * FROM users WHERE username = $1', [username])
    .then(result => {
      const user = result.rows[0];
      if (!user) {
        logger.warn(`Admin - User not found: ${username}`);
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      logger.info(`Admin - Retrieved user info for: ${username}`);
      res.json({ ...user });
    })
    .catch(err => {
      logger.error('Admin - Error querying user info:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    });
};

// Get all emails
exports.getAllEmails = (req, res) => {
  logger.info('Admin request - Getting all emails');

  db.query('SELECT email FROM users')
    .then(result => {
      const emails = result.rows.map(row => row.email);
      const uniqueEmails = emails.filter((email, index, self) => self.indexOf(email) === index);
      logger.info(`Admin - Retrieved ${uniqueEmails.length} unique emails`);
      res.json({
        success: true,
        emails: uniqueEmails
      });
    })
    .catch(err => {
      logger.error('Admin - Error querying emails:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    });
};

// New function to update user data
exports.updateUser = (req, res) => {
  const userData = req.body;
  
  logger.info(`Admin request - Updating user with ID: ${userData.id}`);
  
  if (!userData.id) {
    logger.warn('Admin - Update user failed - Missing user ID');
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }
  const { id, ...updateFields } = userData;

  // Helper to run the update query
  const processUpdate = () => {
    const fields = Object.keys(updateFields);
    const values = Object.values(updateFields);
    if (fields.length === 0) {
      logger.warn(`Admin - Update user failed - No fields to update for user ID: ${id}`);
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const sql = `UPDATE users SET ${setClause} WHERE id = $${fields.length + 1}`;
    values.push(id);
    db.query(sql, values)
      .then(result => {
        if (result.rowCount === 0) {
          logger.warn(`Admin - Update user failed - User not found or no changes: ${id}`);
          return res.status(404).json({ success: false, error: 'User not found or no changes made' });
        }
        logger.info(`Admin - User updated successfully - ID: ${id}, changes: ${result.rowCount}`);
        res.json({
          success: true,
          message: 'User updated successfully',
          changes: result.rowCount
        });
      })
      .catch(err => {
        logger.error('Admin - Error updating user:', err);
        return res.status(500).json({ success: false, error: 'Database error: ' + err.message });
      });
  };

  // Password hashing logic
  if (updateFields.password) {
    const passwordStr = String(updateFields.password);
    bcrypt.hash(passwordStr, saltRounds, (err, hash) => {
      if (err) {
        logger.error('Admin - Error hashing password during update:', err);
        return res.status(500).json({ success: false, error: 'Password hashing failed' });
      }
      updateFields.password = hash;
      processUpdate();
    });
  } else if (updateFields.passwordHash) {
    const passwordStr = String(updateFields.passwordHash);
    bcrypt.hash(passwordStr, saltRounds, (err, hash) => {
      if (err) {
        logger.error('Admin - Error hashing passwordHash during update:', err);
        return res.status(500).json({ success: false, error: 'Password hashing failed' });
      }
      updateFields.passwordHash = hash;
      processUpdate();
    });
  } else if (updateFields.password_hash) {
    const passwordStr = String(updateFields.password_hash);
    bcrypt.hash(passwordStr, saltRounds, (err, hash) => {
      if (err) {
        logger.error('Admin - Error hashing password_hash during update:', err);
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

  logger.info(`Admin request - Deleting user with ID: ${id}`);

  if (!id) {
    logger.warn('Admin - Delete user failed - Missing user ID');
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  const sql = 'DELETE FROM users WHERE id = $1';

  db.query(sql, [id])
    .then(result => {
      if (result.rowCount === 0) {
        logger.warn(`Admin - Delete user failed - User not found: ${id}`);
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      logger.info(`Admin - User deleted successfully - ID: ${id}`);
      res.json({
        success: true,
        message: 'User deleted successfully',
        changes: result.rowCount
      });
    })
    .catch(err => {
      logger.error('Admin - Error deleting user:', err);
      return res.status(500).json({ success: false, error: 'Database error: ' + err.message });
    });
};

exports.createUser = (req, res) => {
  const { username, email, password } = req.body;

  logger.info(`Admin request - Creating user: ${username}, email: ${email}`);

  // Validate required fields
  if (!username || !email || !password) {
    logger.warn('Admin - Create user failed - Missing required fields');
    return res.status(400).json({ 
      success: false, 
      error: 'Username, email, and password are required' 
    });
  }

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    logger.warn(`Admin - Create user failed - Invalid email format: ${email}`);
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  // Check if username or email already exists
  db.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email])
    .then(result => {
      const existingUser = result.rows[0];
      if (existingUser) {
        logger.warn(`Admin - Create user failed - Username or email already exists: ${username}/${email}`);
        return res.status(400).json({ 
          success: false, 
          error: 'Username or email already exists' 
        });
      }

      // Hash the password
      bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
          logger.error('Admin - Error hashing password during user creation:', err);
          return res.status(500).json({ success: false, error: 'Password hashing failed' });
        }

        // Insert new user
        const sql = `
          INSERT INTO users (username, email, password)
          VALUES ($1, $2, $3)
        `;

        db.query(sql, [username, email, hashedPassword])
          .then(result => {
            logger.info(`Admin - User created successfully: ${username}`);
            res.json({
              success: true,
              message: 'User created successfully',
              userId: result.insertId
            });
          })
          .catch(err => {
            logger.error('Admin - Error creating user in database:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
          });
      });
    })
    .catch(err => {
      logger.error('Admin - Error checking existing user:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    });
};

exports.getActiveUsers = (req, res) => {
  const { range } = req.query;
  
  logger.info(`Admin request - Getting active users for range: ${range}`);
  
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
      logger.warn(`Admin - Get active users failed - Invalid range: ${range}`);
      return res.status(400).json({ success: false, error: 'Invalid range parameter' });
  }

  const sql = `
    SELECT COUNT(DISTINCT user_id) as count 
    FROM sessions 
    WHERE last_check_at >= $1
  `;

  db.query(sql, [timeFilter.toISOString()])
    .then(result => {
      const count = result.rows[0] ? result.rows[0].count : 0;
      logger.info(`Admin - Active users retrieved - Range: ${range}, Count: ${count}`);
      res.json({
        success: true,
        count: count,
        range: range
      });
    })
    .catch(err => {
      logger.error('Admin - Error getting active users:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    });
};

exports.getRegistrations = (req, res) => {
  const { range } = req.query;
  
  logger.info(`Admin request - Getting registrations for range: ${range}`);
  
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
      logger.warn(`Admin - Get registrations failed - Invalid range: ${range}`);
      return res.status(400).json({ success: false, error: 'Invalid range parameter' });
  }

  const sql = `
    SELECT COUNT(*) as count 
    FROM users 
    WHERE created_at >= $1
  `;

  db.query(sql, [timeFilter.toISOString()])
    .then(result => {
      const count = result.rows[0] ? result.rows[0].count : 0;
      logger.info(`Admin - Registrations retrieved - Range: ${range}, Count: ${count}`);
      res.json({
        success: true,
        count: count,
        range: range
      });
    })
    .catch(err => {
      logger.error('Admin - Error getting registrations:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    });
};

exports.getHardwareInfo = async (req, res) => {
  logger.info('Admin request - Getting hardware info');
  
  try {
    // Get temperature and fan speed using AWK
    const { stdout: tempFanOutput } = await execPromise(`sensors | awk '
      /temp1/ {
          gsub(/[+°C]/, "", $2);
          temps[++count] = $2
      }
      /fan1/ {
          gsub(/RPM/, "", $3);
          rpm = $2
      }
      END {
          avg = (temps[1] + temps[2]) / 2;
          printf "%.1f|%d", avg, rpm
      }'`);

    // Split the output into temperature and fan speed
    const [temp, fan] = tempFanOutput.split('|').map(Number);

    // Get uptime
    const { stdout: uptimeOutput } = await execPromise('uptime -p');
    const uptime = uptimeOutput.trim().replace('up ', '');

    // Determine temperature color (Red: >70°C, Green: 40-70°C, Blue: <40°C)
    let tempColor;
    if (temp > 70) {
      tempColor = 'red';
    } else if (temp >= 40) {
      tempColor = 'green';
    } else {
      tempColor = 'blue';
    }

    // Determine fan speed color (Red: >3000 RPM, Green: 1500-3000 RPM, Blue: <1500 RPM)
    let fanColor;
    if (fan > 3000) {
      fanColor = 'red';
    } else if (fan >= 1500) {
      fanColor = 'green';
    } else {
      fanColor = 'blue';
    }

    logger.info(`Admin - Hardware info retrieved - Temp: ${temp}°C, Fan: ${fan}RPM, Uptime: ${uptime}`);
    res.json({
      success: true,
      hardware: {
        temperature: {
          value: temp,
          color: tempColor
        },
        fanSpeed: {
          value: fan,
          color: fanColor
        },
        uptime: uptime
      }
    });
  } catch (error) {
    logger.error('Admin - Error getting hardware information:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get hardware information',
      details: error.message
    });
  }
};