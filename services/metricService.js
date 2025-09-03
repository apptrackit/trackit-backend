const { db } = require('../database');
const logger = require('../utils/logger');

class MetricService {
  // Get metric entries for a user
  async getMetricEntries(userId, options = {}) {
    try {
      const { metric_type_id, limit = 100, offset = 0 } = options;
      
      let query = `
        SELECT id, metric_type_id, client_uuid, value, entry_date, source, version, created_at, updated_at
        FROM metric_entries 
        WHERE user_id = $1 AND is_deleted = FALSE
      `;
      
      const queryParams = [userId];
      let paramIndex = 2;
      
      // Add metric type filter if specified
      if (metric_type_id) {
        query += ` AND metric_type_id = $${paramIndex++}`;
        queryParams.push(metric_type_id);
      }
      
      // Add ordering and pagination
      query += ` ORDER BY entry_date DESC, id DESC`;
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      queryParams.push(limit, offset);
      
      const result = await db.query(query, queryParams);
      
      // Normalize timestamp fields to ISO 8601 strings
      const entries = result.rows.map(row => ({
        ...row,
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
      }));
      
      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) FROM metric_entries WHERE user_id = $1';
      const countParams = [userId];
      
      if (metric_type_id) {
        countQuery += ' AND metric_type_id = $2';
        countParams.push(metric_type_id);
      }
      
      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);
      
      return {
        entries: entries,
        total: total
      };
    } catch (error) {
      logger.error('Error getting metric entries:', error);
      throw error;
    }
  }

  // Get available metric types
  async getMetricTypes() {
    try {
      const result = await db.query('SELECT id, name, unit FROM metric_types ORDER BY name');
      return result.rows;
    } catch (error) {
      logger.error('Error getting metric types:', error);
      throw error;
    }
  }

  // Create a new metric entry
  async createMetricEntry(userId, metricTypeId, clientUuid, value, entryDate, source = null) {
    try {
      // Check if the metric_type_id exists
      const typeCheck = await db.query('SELECT id FROM metric_types WHERE id = $1', [metricTypeId]);
      if (typeCheck.rows.length === 0) {
        throw new Error('Metric type not found');
      }

      const result = await db.query(
        `INSERT INTO metric_entries (user_id, metric_type_id, client_uuid, value, entry_date, source)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [userId, metricTypeId, clientUuid, value, entryDate, source]
      );

      return { entryId: result.rows[0].id };
    } catch (error) {
      if (error && error.code === '23505') {
        // Unique violation on (user_id, client_uuid)
        const duplicateError = new Error('Duplicate client_uuid for this user');
        duplicateError.code = 'DUPLICATE_CLIENT_UUID';
        throw duplicateError;
      }
      logger.error('Error creating metric entry:', error);
      throw error;
    }
  }

  // Update a metric entry
  async updateMetricEntry(userId, entryId, updateFields) {
    try {
      const { value, entry_date, source } = updateFields;

      // Build the update query dynamically based on provided fields
      const updates = [];
      const queryParams = [userId, entryId];
      let paramIndex = 3;

      if (value !== undefined) {
        updates.push(`value = $${paramIndex++}`);
        queryParams.push(value);
      }
      if (entry_date !== undefined) {
        updates.push(`entry_date = $${paramIndex++}`);
        queryParams.push(entry_date);
      }
      if (source !== undefined) {
        updates.push(`source = $${paramIndex++}`);
        queryParams.push(source);
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Always bump version and updated_at
      updates.push('version = version + 1');
      updates.push('updated_at = CURRENT_TIMESTAMP');

      const query = `UPDATE metric_entries SET ${updates.join(', ')} WHERE id = $2 AND user_id = $1 AND is_deleted = FALSE RETURNING id`;
      const result = await db.query(query, queryParams);

      if (result.rowCount === 0) {
        throw new Error('Metric entry not found or does not belong to the user');
      }

      // Fetch and return the updated entry with date as ISO 8601 string
      const updated = await db.query(
        'SELECT id, metric_type_id, client_uuid, value, entry_date, source, version, created_at, updated_at FROM metric_entries WHERE id = $1 AND user_id = $2',
        [entryId, userId]
      );
      if (updated.rows.length === 0) {
        throw new Error('Metric entry not found after update');
      }
      const row = updated.rows[0];
      return {
        ...row,
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
      };
    } catch (error) {
      logger.error('Error updating metric entry:', error);
      throw error;
    }
  }

  // Delete a metric entry
  async deleteMetricEntry(userId, entryId) {
    try {
      const result = await db.query(
        'UPDATE metric_entries SET is_deleted = TRUE, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE RETURNING id',
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
