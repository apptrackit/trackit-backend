const { db } = require('../database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');

class AuthService {
  // Generate refresh token
  generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  // Generate device ID
  generateDeviceId(req) {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || 'unknown';
    return crypto.createHash('sha256').update(`${userAgent}${ip}`).digest('hex');
  }

  // Get active sessions count for a user
  async getActiveSessionsCount(userId) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND refresh_token_expires_at > NOW()',
        [userId]
      );
      return result.rows[0] ? result.rows[0].count : 0;
    } catch (error) {
      logger.error('Error getting active sessions count:', error);
      throw error;
    }
  }

  // Authenticate user credentials
  async authenticateUser(username, password) {
    try {
      const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
      const user = result.rows[0];
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return { success: false, message: 'Invalid password' };
      }

      return { success: true, user };
    } catch (error) {
      logger.error('Error authenticating user:', error);
      throw error;
    }
  }

  // Create or update session
  async createSession(user, deviceId) {
    try {
      // Create access token (7 days)
      const accessToken = jwt.sign(
        { userId: user.id, username: user.username, deviceId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Create refresh token (365 days)
      const refreshToken = this.generateRefreshToken();

      // Calculate expiration dates
      const accessTokenExpiresAt = new Date();
      accessTokenExpiresAt.setDate(accessTokenExpiresAt.getDate() + 7);

      const refreshTokenExpiresAt = new Date();
      refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 365);

      // Store or update session in database
      await db.query(
        `INSERT INTO sessions (user_id, device_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, device_id) DO UPDATE
         SET access_token = EXCLUDED.access_token,
             refresh_token = EXCLUDED.refresh_token,
             access_token_expires_at = EXCLUDED.access_token_expires_at,
             refresh_token_expires_at = EXCLUDED.refresh_token_expires_at,
             last_refresh_at = NOW(),
             refresh_count = sessions.refresh_count + 1
        `,
        [user.id, deviceId, accessToken, refreshToken, accessTokenExpiresAt.toISOString(), refreshTokenExpiresAt.toISOString()]
      );

      return {
        accessToken,
        refreshToken,
        deviceId,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      };
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  // Refresh tokens
  async refreshTokens(refreshToken, deviceId) {
    try {
      const result = await db.query(
        'SELECT * FROM sessions WHERE refresh_token = $1 AND device_id = $2 AND refresh_token_expires_at > NOW()',
        [refreshToken, deviceId]
      );

      const session = result.rows[0];
      if (!session) {
        return { success: false, message: 'Invalid or expired refresh token' };
      }

      const userResult = await db.query('SELECT * FROM users WHERE id = $1', [session.user_id]);
      const user = userResult.rows[0];

      // Create new tokens
      const newAccessToken = jwt.sign(
        { userId: user.id, username: user.username, deviceId: session.device_id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const newRefreshToken = this.generateRefreshToken();

      // Calculate new expiration dates
      const newAccessTokenExpiresAt = new Date();
      newAccessTokenExpiresAt.setDate(newAccessTokenExpiresAt.getDate() + 7);

      const newRefreshTokenExpiresAt = new Date();
      newRefreshTokenExpiresAt.setDate(newRefreshTokenExpiresAt.getDate() + 365);

      // Update session
      await db.query(
        'UPDATE sessions SET access_token = $1, refresh_token = $2, access_token_expires_at = $3, refresh_token_expires_at = $4, last_refresh_at = NOW(), refresh_count = refresh_count + 1 WHERE id = $5',
        [newAccessToken, newRefreshToken, newAccessTokenExpiresAt.toISOString(), newRefreshTokenExpiresAt.toISOString(), session.id]
      );

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        deviceId: session.device_id
      };
    } catch (error) {
      logger.error('Error refreshing tokens:', error);
      throw error;
    }
  }

  // Validate session
  async validateSession(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const result = await db.query(
        'SELECT * FROM sessions WHERE access_token = $1 AND device_id = $2 AND access_token_expires_at > NOW()', 
        [token, decoded.deviceId]
      );

      const session = result.rows[0];
      if (!session) {
        return { success: false, message: 'Session expired or invalid' };
      }

      // Update last check time
      await db.query('UPDATE sessions SET last_check_at = NOW() WHERE id = $1', [session.id]);

      const userResult = await db.query('SELECT id, username, email FROM users WHERE id = $1', [decoded.userId]);
      const user = userResult.rows[0];

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      return {
        success: true,
        deviceId: session.device_id,
        user
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return { success: false, message: 'Invalid token' };
      }
      logger.error('Error validating session:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
