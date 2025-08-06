const metricService = require('../services/metricService');
const logger = require('../utils/logger');

// Controller function to get metric entries for a user with enhanced filtering
exports.getMetricEntries = async (req, res) => {
  const user_id = req.user.userId;
  const { 
    metric_type_id, 
    metric_type,
    include_deleted = 'false',
    source,
    since_timestamp,
    limit = 100, 
    offset = 0 
  } = req.query;

  logger.info(`Getting metric entries - User: ${user_id}, Type ID: ${metric_type_id || 'all'}, Type: ${metric_type || 'all'}, Include Deleted: ${include_deleted}, Source: ${source || 'all'}, Limit: ${limit}, Offset: ${offset}`);

  try {
    const result = await metricService.getMetricEntries(user_id, {
      metric_type_id: metric_type_id ? parseInt(metric_type_id) : null,
      metric_type: metric_type || null,
      include_deleted: include_deleted === 'true',
      source: source || null,
      since_timestamp: since_timestamp || null,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    logger.info(`Retrieved ${result.entries.length} metric entries for user: ${user_id}`);
    res.status(200).json({ 
      success: true, 
      entries: result.entries,
      total: result.total
    });
  } catch (error) {
    logger.error('Error getting metric entries:', error);
    res.status(500).json({ message: 'Error retrieving metric entries', error: error.message });
  }
};

// Controller function to get available metric types
exports.getMetricTypes = async (req, res) => {
  logger.info('Getting metric types');

  try {
    const types = await metricService.getMetricTypes();
    logger.info(`Retrieved ${types.length} metric types`);
    res.status(200).json({ 
      success: true, 
      types: types
    });
  } catch (error) {
    logger.error('Error getting metric types:', error);
    res.status(500).json({ message: 'Error retrieving metric types', error: error.message });
  }
};

// Controller function to log a new metric entry with mobile sync support
exports.createMetricEntry = async (req, res) => {
  const user_id = req.user.userId;
  const data = req.body;

  logger.info(`Creating metric entry - User: ${user_id}, Data:`, JSON.stringify(data));

  // Validate required fields - can accept either old or new format
  const hasOldFormat = data.metric_type_id && data.value !== undefined && data.date;
  const hasNewFormat = (data.metric_type_id || data.metric_type) && data.value !== undefined && (data.date || data.timestamp);

  if (!hasOldFormat && !hasNewFormat) {
    logger.warn(`Metric entry creation failed - Missing required fields for user: ${user_id}`);
    return res.status(400).json({ 
      message: 'Missing required fields. Need: (metric_type_id OR metric_type) AND value AND (date OR timestamp)' 
    });
  }

  try {
    const result = await metricService.createMetricEntry(user_id, data);
    logger.info(`Metric entry created successfully - ID: ${result.id}, User: ${user_id}`);
    res.status(201).json({ 
      success: true, 
      message: 'Metric entry created successfully', 
      entry: result,
      entryId: result.id // for backward compatibility
    });
  } catch (error) {
    logger.error('Error creating metric entry:', error);
    if (error.message.includes('not found') || error.message.includes('required')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error creating metric entry', error: error.message });
  }
};

// Controller function to update a metric entry with conflict resolution
exports.updateMetricEntry = async (req, res) => {
  const { entryId } = req.params;
  const updateData = req.body;
  const user_id = req.user.userId;

  logger.info(`Updating metric entry - ID: ${entryId}, User: ${user_id}, Data:`, JSON.stringify(updateData));

  // Check if any update fields are provided
  const validFields = ['value', 'unit', 'date', 'timestamp', 'source', 'client_last_updated_at'];
  const hasValidFields = validFields.some(field => updateData[field] !== undefined);

  if (!hasValidFields) {
     logger.warn(`Metric entry update failed - No update fields provided for entry: ${entryId}`);
     return res.status(400).json({ message: 'No valid update fields provided.' });
  }

  try {
    const updatedEntry = await metricService.updateMetricEntry(user_id, entryId, updateData);
    logger.info(`Metric entry updated successfully - ID: ${entryId}, User: ${user_id}`);
    res.status(200).json({ 
      success: true, 
      message: 'Metric entry updated successfully', 
      entry: updatedEntry 
    });
  } catch (error) {
    logger.error('Error updating metric entry:', error);
    if (error.message.includes('not found') || error.message.includes('does not belong')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('sync conflict') || error.message.includes('newer')) {
      return res.status(409).json({ message: error.message }); // 409 Conflict
    }
    if (error.message.includes('deleted')) {
      return res.status(410).json({ message: error.message }); // 410 Gone
    }
    res.status(500).json({ message: 'Error updating metric entry', error: error.message });
  }
};

// Controller function to delete a metric entry (soft delete by default)
exports.deleteMetricEntry = async (req, res) => {
  const { entryId } = req.params;
  const { hard_delete = 'false' } = req.query;
  const user_id = req.user.userId;

  logger.info(`Deleting metric entry - ID: ${entryId}, User: ${user_id}, Hard Delete: ${hard_delete}`);

  try {
    const result = await metricService.deleteMetricEntry(user_id, entryId, { 
      hard_delete: hard_delete === 'true' 
    });
    logger.info(`Metric entry deleted successfully - ID: ${entryId}, User: ${user_id}`);
    
    if (hard_delete === 'true') {
      res.status(200).json({ success: true, message: 'Metric entry permanently deleted' });
    } else {
      res.status(200).json({ 
        success: true, 
        message: 'Metric entry deleted', 
        entry: result
      });
    }
  } catch (error) {
    logger.error('Error deleting metric entry:', error);
    if (error.message.includes('not found') || error.message.includes('does not belong') || error.message.includes('already deleted')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error deleting metric entry', error: error.message });
  }
};

// Controller function to restore a soft-deleted metric entry
exports.restoreMetricEntry = async (req, res) => {
  const { entryId } = req.params;
  const user_id = req.user.userId;

  logger.info(`Restoring metric entry - ID: ${entryId}, User: ${user_id}`);

  try {
    const result = await metricService.restoreMetricEntry(user_id, entryId);
    logger.info(`Metric entry restored successfully - ID: ${entryId}, User: ${user_id}`);
    res.status(200).json({ 
      success: true, 
      message: 'Metric entry restored successfully',
      entry: result
    });
  } catch (error) {
    logger.error('Error restoring metric entry:', error);
    if (error.message.includes('not found') || error.message.includes('does not belong') || error.message.includes('not deleted')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error restoring metric entry', error: error.message });
  }
};

// Controller function to get changes since a timestamp (for sync)
exports.getChangesSince = async (req, res) => {
  const user_id = req.user.userId;
  const { since_timestamp, limit = 1000 } = req.query;

  if (!since_timestamp) {
    return res.status(400).json({ message: 'since_timestamp parameter is required' });
  }

  logger.info(`Getting changes since ${since_timestamp} for user: ${user_id}`);

  try {
    const result = await metricService.getChangesSince(user_id, since_timestamp, {
      limit: parseInt(limit)
    });
    
    logger.info(`Retrieved ${result.entries.length} changed entries for user: ${user_id}`);
    res.status(200).json({ 
      success: true, 
      entries: result.entries,
      has_more: result.has_more,
      server_timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting changes since timestamp:', error);
    res.status(500).json({ message: 'Error retrieving changes', error: error.message });
  }
};