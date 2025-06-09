const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { generateDeviceId } = require('../auth');
const { db } = require('../database');
const logger = require('../utils/logger');

// Generate refresh token
const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Register a new user
exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  
  logger.info(`Registration attempt for username: ${username}, email: ${email}`);
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    logger.warn(`Registration failed - Invalid email format: ${email}`);
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }
  
  try {
    const saltRounds = parseInt(process.env.SALT);
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    db.query('SELECT username FROM users WHERE username = $1', [username])
      .then(result => {
        if (result.rows.length > 0) {
          logger.warn(`Registration failed - Username already exists: ${username}`);
          return res.status(409).json({ success: false, error: 'Username already exists' });
        }
        
        db.query(
          'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id', 
          [username, email, hashedPassword]
        )
        .then(result => {
          const userId = result.rows[0].id;
          logger.info(`User registered successfully - ID: ${userId}, username: ${username}`);

          // Create access token (7 days)
          const accessToken = jwt.sign(
            { userId: userId, username: username, deviceId: generateDeviceId(req) },
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

          const deviceId = generateDeviceId(req);

          // Store session in database
          db.query(
            'INSERT INTO sessions (user_id, device_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [userId, deviceId, accessToken, refreshToken, accessTokenExpiresAt.toISOString(), refreshTokenExpiresAt.toISOString()]
          )
          .then(() => {
            logger.info(`Session created for user: ${username}, device: ${deviceId}`);
            res.status(201).json({ 
              success: true, 
              authenticated: true,
              message: 'Registration successful',
              accessToken: accessToken,
              refreshToken: refreshToken,
              apiKey: process.env.API_KEY,
              deviceId: deviceId,
              user: {
                id: userId,
                username: username,
                email: email
              }
            });
          })
          .catch(err => {
            logger.error('Error creating session during registration:', err);
            return res.status(500).json({ success: false, error: 'Failed to create session' });
          });
        })
        .catch(err => {
          logger.error('Error inserting user into database:', err);
          return res.status(500).json({ success: false, error: 'Database error' });
        });
      })
      .catch(err => {
        logger.error('Error checking username availability:', err);
        return res.status(500).json({ success: false, error: 'Database error' });
      });
  } catch (error) {
    logger.error('Error hashing password during registration:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  
  logger.info(`Password change attempt for username: ${username}`);
  
  if (!username || !oldPassword || !newPassword) {
    logger.warn('Password change failed - Missing required fields');
    return res.status(400).json({ success: false, error: 'Username, old password, and new password are required' });
  }

  db.query('SELECT * FROM users WHERE username = $1', [username])
    .then(async result => {
      const user = result.rows[0];
      if (!user) {
        logger.warn(`Password change failed - User not found: ${username}`);
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      try {
        const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
        
        if (!isOldPasswordValid) {
          logger.warn(`Password change failed - Incorrect old password for user: ${username}`);
          return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }
        
        const saltRounds = parseInt(process.env.SALT);
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
        
        db.query(
          'UPDATE users SET password = $1 WHERE username = $2', 
          [hashedNewPassword, username]
        )
        .then(() => {
          logger.info(`Password updated successfully for user: ${username}`);
          res.json({ success: true, message: 'Password updated successfully' });
        })
        .catch(err => {
          logger.error('Error updating password in database:', err);
          return res.status(500).json({ success: false, error: 'Database error' });
        });
      } catch (error) {
        logger.error('Error processing password change:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    })
    .catch(err => {
      logger.error('Error querying user for password change:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    });
};

// Change username
exports.changeUsername = async (req, res) => {
  const { oldUsername, newUsername, password } = req.body;
  
  logger.info(`Username change attempt from: ${oldUsername} to: ${newUsername}`);
  
  if (!oldUsername || !newUsername || !password) {
    logger.warn('Username change failed - Missing required fields');
    return res.status(400).json({ success: false, error: 'Current username, new username, and password are required' });
  }
  
  db.query('SELECT * FROM users WHERE username = $1', [oldUsername])
    .then(async result => {
      const user = result.rows[0];
      if (!user) {
        logger.warn(`Username change failed - User not found: ${oldUsername}`);
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      try {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
          logger.warn(`Username change failed - Incorrect password for user: ${oldUsername}`);
          return res.status(401).json({ success: false, error: 'Password is incorrect' });
        }
        
        db.query('SELECT username FROM users WHERE username = $1', [newUsername])
          .then(existingUserResult => {
            if (existingUserResult.rows.length > 0) {
              logger.warn(`Username change failed - New username already exists: ${newUsername}`);
              return res.status(409).json({ success: false, error: 'Username already exists' });
            }
            
            db.query(
              'UPDATE users SET username = $1 WHERE username = $2', 
              [newUsername, oldUsername]
            )
            .then(() => {
              logger.info(`Username updated successfully from: ${oldUsername} to: ${newUsername}`);
              res.json({ success: true, message: 'Username updated successfully' });
            })
            .catch(err => {
              logger.error('Error updating username in database:', err);
              return res.status(500).json({ success: false, error: 'Database error' });
            });
          })
          .catch(err => {
            logger.error('Error checking new username availability:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
          });
      } catch (error) {
        logger.error('Error processing username change:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    })
    .catch(err => {
      logger.error('Error querying user for username change:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    });
};

// Change email
exports.changeEmail = async (req, res) => {
  const { username, newEmail, password } = req.body;
  
  logger.info(`Email change attempt for username: ${username} to: ${newEmail}`);
  
  if (!username || !newEmail || !password) {
    logger.warn('Email change failed - Missing required fields');
    return res.status(400).json({ success: false, error: 'Username, new email, and password are required' });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    logger.warn(`Email change failed - Invalid email format: ${newEmail}`);
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }
  
  db.query('SELECT * FROM users WHERE username = $1', [username])
    .then(async result => {
      const user = result.rows[0];
      if (!user) {
        logger.warn(`Email change failed - User not found: ${username}`);
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      try {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
          logger.warn(`Email change failed - Incorrect password for user: ${username}`);
          return res.status(401).json({ success: false, error: 'Password is incorrect' });
        }
        
        db.query(
          'UPDATE users SET email = $1 WHERE username = $2', 
          [newEmail, username]
        )
        .then(() => {
          logger.info(`Email updated successfully for user: ${username} to: ${newEmail}`);
          res.json({ success: true, message: 'Email updated successfully' });
        })
        .catch(err => {
          logger.error('Error updating email in database:', err);
          return res.status(500).json({ success: false, error: 'Database error' });
        });
      } catch (error) {
        logger.error('Error processing email change:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    })
    .catch(err => {
      logger.error('Error querying user for email change:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    });
};

// Delete account
exports.deleteAccount = async (req, res) => {
  const { username, password } = req.body;
  
  logger.info(`Account deletion attempt for username: ${username}`);
  
  if (!username || !password) {
    logger.warn('Account deletion failed - Missing required fields');
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  db.query('SELECT * FROM users WHERE username = $1', [username])
    .then(async result => {
      const user = result.rows[0];
      if (!user) {
        logger.warn(`Account deletion failed - User not found: ${username}`);
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      try {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
          logger.warn(`Account deletion failed - Incorrect password for user: ${username}`);
          return res.status(401).json({ success: false, error: 'Password is incorrect' });
        }
        
        db.query(
          'DELETE FROM users WHERE username = $1', 
          [username]
        )
        .then(() => {
          logger.info(`Account deleted successfully for user: ${username}`);
          res.json({ success: true, message: 'Account deleted successfully' });
        })
        .catch(err => {
          logger.error('Error deleting account from database:', err);
          return res.status(500).json({ success: false, error: 'Database error' });
        });
      } catch (error) {
        logger.error('Error processing account deletion:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    })
    .catch(err => {
      logger.error('Error querying user for account deletion:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    });
};
