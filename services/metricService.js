const { db } = require('../database');
const logger = require('../utils/logger');

class MetricService {
  // Get metric entries for a user
  async getMetricEntries(userId, options = {}) {
    try {
      const { metric_type_id, limit = 100, offset = 0 } = options;
      
      let query = `
        SELECT id, metric_type_id, value, date, is_apple_health,
               uuid, backend_id, healthkit_id, sync_status, modified_at, 
               source, deleted_locally, hash_key, sync_error
        FROM metric_entries 
        WHERE user_id = $1 AND deleted_locally = FALSE
      `;
      
      const queryParams = [userId];
      let paramIndex = 2;
      
      // Add metric type filter if specified
      if (metric_type_id) {
        query += ` AND metric_type_id = $${paramIndex++}`;
        queryParams.push(metric_type_id);
      }
      
      // Add ordering and pagination
      query += ` ORDER BY date DESC, id DESC`;
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      queryParams.push(limit, offset);
      
      const result = await db.query(query, queryParams);
      
      // Convert date to ISO 8601 UTC string for each entry
      const entries = result.rows.map(row => ({
        ...row,
        date: row.date instanceof Date ? row.date.toISOString() : row.date,
        modified_at: row.modified_at instanceof Date ? row.modified_at.toISOString() : row.modified_at
      }));
      
      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) FROM metric_entries WHERE user_id = $1 AND deleted_locally = FALSE';
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
  async createMetricEntry(userId, metricTypeId, value, date, isAppleHealth = false, syncData = {}) {
    try {
      // Check if the metric_type_id exists
      const typeCheck = await db.query('SELECT id FROM metric_types WHERE id = $1', [metricTypeId]);
      if (typeCheck.rows.length === 0) {
        throw new Error('Metric type not found');
      }

      const {
        healthkit_id,
        source = isAppleHealth ? 'healthKit' : 'localApp',
        sync_status = 'pendingCreate',
        hash_key
      } = syncData;

      const result = await db.query(
        `INSERT INTO metric_entries (user_id, metric_type_id, value, date, is_apple_health, 
                                   healthkit_id, source, sync_status, hash_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING id, uuid`,
        [userId, metricTypeId, value, date, isAppleHealth, healthkit_id, source, sync_status, hash_key]
      );

      return { 
        entryId: result.rows[0].id,
        uuid: result.rows[0].uuid 
      };
    } catch (error) {
      logger.error('Error creating metric entry:', error);
      throw error;
    }
  }

  // Update a metric entry
  async updateMetricEntry(userId, entryId, updateFields) {
    try {
      const { 
        value, 
        date, 
        is_apple_health, 
        sync_status, 
        backend_id, 
        sync_error,
        deleted_locally 
      } = updateFields;

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
      if (sync_status !== undefined) {
        updates.push(`sync_status = $${paramIndex++}`);
        queryParams.push(sync_status);
      }
      if (backend_id !== undefined) {
        updates.push(`backend_id = $${paramIndex++}`);
        queryParams.push(backend_id);
      }
      if (sync_error !== undefined) {
        updates.push(`sync_error = $${paramIndex++}`);
        queryParams.push(sync_error);
      }
      if (deleted_locally !== undefined) {
        updates.push(`deleted_locally = $${paramIndex++}`);
        queryParams.push(deleted_locally);
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      const query = `UPDATE metric_entries SET ${updates.join(', ')} WHERE id = $2 AND user_id = $1 RETURNING id`;
      const result = await db.query(query, queryParams);

      if (result.rowCount === 0) {
        throw new Error('Metric entry not found or does not belong to the user');
      }

      // Fetch and return the updated entry with dates as ISO 8601 strings
      const updated = await db.query(
        `SELECT id, metric_type_id, value, date, is_apple_health,
                uuid, backend_id, healthkit_id, sync_status, modified_at, 
                source, deleted_locally, hash_key, sync_error
         FROM metric_entries WHERE id = $1 AND user_id = $2`,
        [entryId, userId]
      );
      if (updated.rows.length === 0) {
        throw new Error('Metric entry not found after update');
      }
      const row = updated.rows[0];
      return {
        ...row,
        date: row.date instanceof Date ? row.date.toISOString() : row.date,
        modified_at: row.modified_at instanceof Date ? row.modified_at.toISOString() : row.modified_at
      };
    } catch (error) {
      logger.error('Error updating metric entry:', error);
      throw error;
    }
  }

  // Delete a metric entry (soft delete for sync purposes)
  async deleteMetricEntry(userId, entryId, hardDelete = false) {
    try {
      if (hardDelete) {
        // Permanent deletion
        const result = await db.query(
          'DELETE FROM metric_entries WHERE id = $1 AND user_id = $2 RETURNING id',
          [entryId, userId]
        );

        if (result.rowCount === 0) {
          throw new Error('Metric entry not found or does not belong to the user');
        }
      } else {
        // Soft delete - mark as deleted locally and set sync status
        const result = await db.query(
          `UPDATE metric_entries 
           SET deleted_locally = TRUE, sync_status = 'pendingDelete' 
           WHERE id = $1 AND user_id = $2 RETURNING id`,
          [entryId, userId]
        );

        if (result.rowCount === 0) {
          throw new Error('Metric entry not found or does not belong to the user');
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('Error deleting metric entry:', error);
      throw error;
    }
  }

  // Sync-related methods

  // Get entries that need to be synced
  async getPendingSyncEntries(userId, syncStatus = null) {
    try {
      let query = `
        SELECT id, metric_type_id, value, date, is_apple_health,
               uuid, backend_id, healthkit_id, sync_status, modified_at, 
               source, deleted_locally, hash_key, sync_error
        FROM metric_entries 
        WHERE user_id = $1
      `;
      const queryParams = [userId];

      if (syncStatus) {
        query += ' AND sync_status = $2';
        queryParams.push(syncStatus);
      } else {
        query += " AND sync_status IN ('pendingCreate', 'pendingUpdate', 'pendingDelete')";
      }

      query += ' ORDER BY modified_at ASC';

      const result = await db.query(query, queryParams);
      
      return result.rows.map(row => ({
        ...row,
        date: row.date instanceof Date ? row.date.toISOString() : row.date,
        modified_at: row.modified_at instanceof Date ? row.modified_at.toISOString() : row.modified_at
      }));
    } catch (error) {
      logger.error('Error getting pending sync entries:', error);
      throw error;
    }
  }

  // Find entry by HealthKit ID to prevent duplicates
  async findByHealthKitId(userId, healthkitId) {
    try {
      const result = await db.query(
        `SELECT id, uuid, sync_status FROM metric_entries 
         WHERE user_id = $1 AND healthkit_id = $2 AND deleted_locally = FALSE`,
        [userId, healthkitId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding entry by HealthKit ID:', error);
      throw error;
    }
  }

  // Find entry by hash key for deduplication
  async findByHashKey(userId, hashKey) {
    try {
      const result = await db.query(
        `SELECT id, uuid, sync_status FROM metric_entries 
         WHERE user_id = $1 AND hash_key = $2 AND deleted_locally = FALSE`,
        [userId, hashKey]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding entry by hash key:', error);
      throw error;
    }
  }

  // Update sync status and backend ID after successful sync
  async updateSyncStatus(userId, entryId, syncStatus, backendId = null, syncError = null) {
    try {
      const updates = ['sync_status = $3'];
      const queryParams = [userId, entryId, syncStatus];
      let paramIndex = 4;

      if (backendId !== null) {
        updates.push(`backend_id = $${paramIndex++}`);
        queryParams.push(backendId);
      }

      if (syncError !== null) {
        updates.push(`sync_error = $${paramIndex++}`);
        queryParams.push(syncError);
      }

      const query = `UPDATE metric_entries SET ${updates.join(', ')} WHERE id = $2 AND user_id = $1`;
      const result = await db.query(query, queryParams);

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error updating sync status:', error);
      throw error;
    }
  }
}

module.exports = new MetricService();
