const { db } = require('../database');
const logger = require('../utils/logger');

class MetricService {
  // Create a new metric entry
  async createMetricEntry(userId, metricTypeId, value, date, isAppleHealth = false) {
    try {
      // Check if the metric_type_id exists
      const typeCheck = await db.query('SELECT id FROM metric_types WHERE id = $1', [metricTypeId]);
      if (typeCheck.rows.length === 0) {
        throw new Error('Metric type not found');
      }

      const result = await db.query(
        `INSERT INTO metric_entries (user_id, metric_type_id, value, date, is_apple_health)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [userId, metricTypeId, value, date, isAppleHealth]
      );

      return { entryId: result.rows[0].id };
    } catch (error) {
      logger.error('Error creating metric entry:', error);
      throw error;
    }
  }

  // Update a metric entry
  async updateMetricEntry(userId, entryId, updateFields) {
    try {
      const { value, date, is_apple_health } = updateFields;

      // Build the update query dynamically based on provided fields
      const updates = [];
      const queryParams = [userId, entryId];
      let paramIndex = 3;

      if (value !== undefined) {
        updates.push(`value = $${paramIndex++}`);
        queryParams.push(value);
      }
      if (date !== undefined) {
        updates.push(`date = $${paramIndex++}`);
        queryParams.push(date);
      }
      if (is_apple_health !== undefined) {
        updates.push(`is_apple_health = $${paramIndex++}`);
        queryParams.push(is_apple_health);
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      const query = `UPDATE metric_entries SET ${updates.join(', ')} WHERE id = $2 AND user_id = $1 RETURNING id`;
      const result = await db.query(query, queryParams);

      if (result.rowCount === 0) {
        throw new Error('Metric entry not found or does not belong to the user');
      }

      return { success: true };
    } catch (error) {
      logger.error('Error updating metric entry:', error);
      throw error;
    }
  }

  // Delete a metric entry
  async deleteMetricEntry(userId, entryId) {
    try {
      const result = await db.query(
        'DELETE FROM metric_entries WHERE id = $1 AND user_id = $2 RETURNING id',
        [entryId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Metric entry not found or does not belong to the user');
      }

      return { success: true };
    } catch (error) {
      logger.error('Error deleting metric entry:', error);
      throw error;
    }
  }
}

module.exports = new MetricService();
