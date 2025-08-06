const { db } = require('../database');
const logger = require('../utils/logger');

class MetricService {
  // Get metric entries for a user with support for filtering deleted entries
  async getMetricEntries(userId, options = {}) {
    try {
      const { 
        metric_type_id, 
        metric_type, 
        include_deleted = false,
        source,
        since_timestamp,
        limit = 100, 
        offset = 0 
      } = options;
      
      let query = `
        SELECT 
          id, 
          metric_type_id, 
          metric_type,
          value, 
          unit,
          date, 
          source,
          last_updated_at,
          is_deleted
        FROM metric_entries 
        WHERE user_id = $1
      `;
      
      const queryParams = [userId];
      let paramIndex = 2;
      
      // Filter out deleted entries unless explicitly requested
      if (!include_deleted) {
        query += ` AND is_deleted = FALSE`;
      }

      // Add metric type ID filter if specified
      if (metric_type_id) {
        query += ` AND metric_type_id = $${paramIndex++}`;
        queryParams.push(metric_type_id);
      }

      // Add metric type filter if specified
      if (metric_type) {
        query += ` AND metric_type = $${paramIndex++}`;
        queryParams.push(metric_type);
      }

      // Add source filter if specified
      if (source) {
        query += ` AND source = $${paramIndex++}`;
        queryParams.push(source);
      }

      // Add timestamp filter for incremental sync
      if (since_timestamp) {
        query += ` AND last_updated_at > $${paramIndex++}`;
        queryParams.push(since_timestamp);
      }
      
      // Add ordering and pagination
      query += ` ORDER BY date DESC, id DESC`;
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      queryParams.push(limit, offset);
      
      const result = await db.query(query, queryParams);
      
      // Convert dates to ISO 8601 UTC strings for each entry
      const entries = result.rows.map(row => ({
        ...row,
        date: row.date instanceof Date ? row.date.toISOString() : row.date,
        last_updated_at: row.last_updated_at instanceof Date ? row.last_updated_at.toISOString() : row.last_updated_at,
        timestamp: row.date instanceof Date ? row.date.toISOString() : row.date, // alias for mobile apps
      }));
      
      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) FROM metric_entries WHERE user_id = $1';
      const countParams = [userId];
      let countParamIndex = 2;
      
      if (!include_deleted) {
        countQuery += ' AND is_deleted = FALSE';
      }
      
      if (metric_type_id) {
        countQuery += ` AND metric_type_id = $${countParamIndex++}`;
        countParams.push(metric_type_id);
      }

      if (metric_type) {
        countQuery += ` AND metric_type = $${countParamIndex++}`;
        countParams.push(metric_type);
      }
      
      if (source) {
        countQuery += ` AND source = $${countParamIndex++}`;
        countParams.push(source);
      }

      if (since_timestamp) {
        countQuery += ` AND last_updated_at > $${countParamIndex++}`;
        countParams.push(since_timestamp);
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

  // Create a new metric entry with full support for mobile sync
  async createMetricEntry(userId, data) {
    try {
      const { 
        id, // Allow client to specify UUID
        metric_type_id, 
        metric_type,
        value, 
        unit,
        date, 
        timestamp, // alias for date
        source = 'app'
      } = data;

      // Use timestamp if provided, otherwise use date
      const entryDate = timestamp || date;
      
      if (!entryDate) {
        throw new Error('Date/timestamp is required');
      }

      // If metric_type is provided but not metric_type_id, look it up
      let finalMetricTypeId = metric_type_id;
      let finalMetricType = metric_type;
      let finalUnit = unit;

      if (metric_type && !metric_type_id) {
        const typeResult = await db.query('SELECT id, unit FROM metric_types WHERE name = $1', [metric_type]);
        if (typeResult.rows.length > 0) {
          finalMetricTypeId = typeResult.rows[0].id;
          if (!finalUnit) {
            finalUnit = typeResult.rows[0].unit || '';
          }
        }
      } else if (metric_type_id && !metric_type) {
        const typeResult = await db.query('SELECT name, unit FROM metric_types WHERE id = $1', [metric_type_id]);
        if (typeResult.rows.length > 0) {
          finalMetricType = typeResult.rows[0].name;
          if (!finalUnit) {
            finalUnit = typeResult.rows[0].unit || '';
          }
        }
      }

      if (!finalMetricTypeId) {
        throw new Error('Metric type ID or valid metric type name is required');
      }

      if (!finalMetricType) {
        throw new Error('Metric type name is required');
      }

      // Ensure unit is provided
      if (!finalUnit) {
        finalUnit = '';
      }

      const query = `
        INSERT INTO metric_entries (
          ${id ? 'id,' : ''}
          user_id, 
          metric_type_id, 
          metric_type,
          value, 
          unit,
          date, 
          source, 
          last_updated_at
        )
        VALUES (
          ${id ? '$1,' : ''}
          $${id ? 2 : 1}, 
          $${id ? 3 : 2}, 
          $${id ? 4 : 3}, 
          $${id ? 5 : 4}, 
          $${id ? 6 : 5}, 
          $${id ? 7 : 6}, 
          $${id ? 8 : 7}, 
          CURRENT_TIMESTAMP
        ) 
        RETURNING id, metric_type_id, metric_type, value, unit, date, source, last_updated_at, is_deleted
      `;

      const queryParams = id 
        ? [id, userId, finalMetricTypeId, finalMetricType, value, finalUnit, entryDate, source]
        : [userId, finalMetricTypeId, finalMetricType, value, finalUnit, entryDate, source];

      const result = await db.query(query, queryParams);
      const row = result.rows[0];

      return {
        ...row,
        date: row.date instanceof Date ? row.date.toISOString() : row.date,
        timestamp: row.date instanceof Date ? row.date.toISOString() : row.date,
        last_updated_at: row.last_updated_at instanceof Date ? row.last_updated_at.toISOString() : row.last_updated_at
      };
    } catch (error) {
      logger.error('Error creating metric entry:', error);
      throw error;
    }
  }

  // Update a metric entry with conflict resolution
  async updateMetricEntry(userId, entryId, updateFields) {
    try {
      const { 
        value, 
        unit,
        date, 
        timestamp, // alias for date
        source,
        client_last_updated_at // for conflict resolution
      } = updateFields;

      // Check if entry exists and get current data for conflict resolution
      const existing = await db.query(
        'SELECT last_updated_at, is_deleted FROM metric_entries WHERE id = $1 AND user_id = $2',
        [entryId, userId]
      );

      if (existing.rows.length === 0) {
        throw new Error('Metric entry not found or does not belong to the user');
      }

      const existingEntry = existing.rows[0];
      
      // If entry is deleted, don't allow updates
      if (existingEntry.is_deleted) {
        throw new Error('Cannot update deleted metric entry');
      }

      // Conflict resolution: check if client data is newer
      if (client_last_updated_at) {
        const clientTimestamp = new Date(client_last_updated_at);
        const serverTimestamp = new Date(existingEntry.last_updated_at);
        
        if (clientTimestamp <= serverTimestamp) {
          throw new Error('Server data is newer - sync conflict detected');
        }
      }

      // Build the update query dynamically based on provided fields
      const updates = [];
      const queryParams = [userId, entryId];
      let paramIndex = 3;

      if (value !== undefined) {
        updates.push(`value = $${paramIndex++}`);
        queryParams.push(value);
      }
      if (unit !== undefined) {
        updates.push(`unit = $${paramIndex++}`);
        queryParams.push(unit);
      }
      if (date !== undefined || timestamp !== undefined) {
        updates.push(`date = $${paramIndex++}`);
        queryParams.push(timestamp || date);
      }
      if (source !== undefined) {
        updates.push(`source = $${paramIndex++}`);
        queryParams.push(source);
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      // last_updated_at will be automatically updated by trigger

      const query = `
        UPDATE metric_entries 
        SET ${updates.join(', ')} 
        WHERE id = $2 AND user_id = $1 
        RETURNING id, metric_type_id, metric_type, value, unit, date, source, last_updated_at, is_deleted
      `;
      const result = await db.query(query, queryParams);

      if (result.rowCount === 0) {
        throw new Error('Metric entry not found or does not belong to the user');
      }

      const row = result.rows[0];
      return {
        ...row,
        date: row.date instanceof Date ? row.date.toISOString() : row.date,
        timestamp: row.date instanceof Date ? row.date.toISOString() : row.date,
        last_updated_at: row.last_updated_at instanceof Date ? row.last_updated_at.toISOString() : row.last_updated_at
      };
    } catch (error) {
      logger.error('Error updating metric entry:', error);
      throw error;
    }
  }

  // Soft delete a metric entry
  async deleteMetricEntry(userId, entryId, options = {}) {
    try {
      const { hard_delete = false } = options;

      if (hard_delete) {
        // Permanent deletion
        const result = await db.query(
          'DELETE FROM metric_entries WHERE id = $1 AND user_id = $2 RETURNING id',
          [entryId, userId]
        );

        if (result.rowCount === 0) {
          throw new Error('Metric entry not found or does not belong to the user');
        }
      } else {
        // Soft delete - mark as deleted
        const result = await db.query(
          `UPDATE metric_entries 
           SET is_deleted = TRUE 
           WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE
           RETURNING id, last_updated_at`,
          [entryId, userId]
        );

        if (result.rowCount === 0) {
          throw new Error('Metric entry not found, does not belong to the user, or already deleted');
        }

        const row = result.rows[0];
        return {
          id: row.id,
          is_deleted: true,
          last_updated_at: row.last_updated_at instanceof Date ? row.last_updated_at.toISOString() : row.last_updated_at
        };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error deleting metric entry:', error);
      throw error;
    }
  }

  // Restore a soft-deleted metric entry
  async restoreMetricEntry(userId, entryId) {
    try {
      const result = await db.query(
        `UPDATE metric_entries 
         SET is_deleted = FALSE 
         WHERE id = $1 AND user_id = $2 AND is_deleted = TRUE
         RETURNING id, metric_type_id, metric_type, value, unit, date, source, last_updated_at, is_deleted`,
        [entryId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Metric entry not found, does not belong to the user, or not deleted');
      }

      const row = result.rows[0];
      return {
        ...row,
        date: row.date instanceof Date ? row.date.toISOString() : row.date,
        timestamp: row.date instanceof Date ? row.date.toISOString() : row.date,
        last_updated_at: row.last_updated_at instanceof Date ? row.last_updated_at.toISOString() : row.last_updated_at
      };
    } catch (error) {
      logger.error('Error restoring metric entry:', error);
      throw error;
    }
  }

  // Get changes since a specific timestamp for sync
  async getChangesSince(userId, since_timestamp, options = {}) {
    try {
      const { limit = 1000 } = options;
      
      const result = await db.query(`
        SELECT 
          id, 
          metric_type_id, 
          metric_type,
          value, 
          unit,
          date, 
          source,
          last_updated_at,
          is_deleted
        FROM metric_entries 
        WHERE user_id = $1 
        AND last_updated_at > $2
        ORDER BY last_updated_at ASC
        LIMIT $3
      `, [userId, since_timestamp, limit]);

      const entries = result.rows.map(row => ({
        ...row,
        date: row.date instanceof Date ? row.date.toISOString() : row.date,
        timestamp: row.date instanceof Date ? row.date.toISOString() : row.date,
        last_updated_at: row.last_updated_at instanceof Date ? row.last_updated_at.toISOString() : row.last_updated_at
      }));

      return {
        entries,
        has_more: entries.length === limit
      };
    } catch (error) {
      logger.error('Error getting changes since timestamp:', error);
      throw error;
    }
  }
}

module.exports = new MetricService();
