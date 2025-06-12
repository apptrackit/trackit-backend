const { db } = require('../database');
const logger = require('../utils/logger');

class SessionService {
  // Get user sessions
  async getUserSessions(userId) {
    try {
      const result = await db.query(
        'SELECT id, device_id, created_at, last_refresh_at, last_check_at, refresh_count FROM sessions WHERE user_id = $1 AND refresh_token_expires_at > NOW()',
        [userId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting user sessions:', error);
      throw error;
    }
  }

  // Logout specific session
  async logoutSession(deviceId, userId) {
    try {
      const result = await db.query('DELETE FROM sessions WHERE device_id = $1 AND user_id = $2', [deviceId, userId]);
      return { success: true, deletedCount: result.rowCount };
    } catch (error) {
      logger.error('Error logging out session:', error);
      throw error;
    }
  }

  // Logout all user sessions
  async logoutAllSessions(userId) {
    try {
      const result = await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      return { success: true, deletedCount: result.rowCount };
    } catch (error) {
      logger.error('Error logging out all sessions:', error);
      throw error;
    }
  }

  // Get active users count by time range
  async getActiveUsersCount(timeFilter) {
    try {
      const result = await db.query(
        'SELECT COUNT(DISTINCT user_id) as count FROM sessions WHERE last_check_at >= $1',
        [timeFilter.toISOString()]
      );
      return result.rows[0] ? result.rows[0].count : 0;
    } catch (error) {
      logger.error('Error getting active users count:', error);
      throw error;
    }
  }

  // Get registrations count by time range
  async getRegistrationsCount(timeFilter) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM users WHERE created_at >= $1',
        [timeFilter.toISOString()]
      );
      return result.rows[0] ? result.rows[0].count : 0;
    } catch (error) {
      logger.error('Error getting registrations count:', error);
      throw error;
    }
  }
}

module.exports = new SessionService();
