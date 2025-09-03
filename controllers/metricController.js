const metricService = require('../services/metricService');
const logger = require('../utils/logger');

// Controller function to get metric entries for a user
exports.getMetricEntries = async (req, res) => {
  const user_id = req.user.userId;
  const { metric_type_id, limit = 100, offset = 0 } = req.query;

  logger.info(`Getting metric entries - User: ${user_id}, Type: ${metric_type_id || 'all'}, Limit: ${limit}, Offset: ${offset}`);

  try {
    const result = await metricService.getMetricEntries(user_id, {
      metric_type_id: metric_type_id ? parseInt(metric_type_id) : null,
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

// Controller function to log a new metric entry
exports.createMetricEntry = async (req, res) => {
  const { metric_type_id, client_uuid, value, entry_date, source = null } = req.body;
  const user_id = req.user.userId;

  logger.info(`Creating metric entry - User: ${user_id}, Type: ${metric_type_id}, ClientUUID: ${client_uuid}, Value: ${value}, EntryDate: ${entry_date}`);

  if (!metric_type_id || !client_uuid || value === undefined || !entry_date) {
    logger.warn(`Metric entry creation failed - Missing required fields for user: ${user_id}`);
    return res.status(400).json({ message: 'Missing required fields: metric_type_id, client_uuid, value, entry_date.' });
  }

  try {
    const result = await metricService.createMetricEntry(user_id, metric_type_id, client_uuid, value, entry_date, source);
    logger.info(`Metric entry created successfully - ID: ${result.entryId}, User: ${user_id}`);
    res.status(201).json({ success: true, message: 'Metric entry created successfully', entryId: result.entryId });
  } catch (error) {
    logger.error('Error creating metric entry:', error);
    if (error.message === 'Metric type not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === 'DUPLICATE_CLIENT_UUID') {
      return res.status(409).json({ message: 'Duplicate client_uuid for this user' });
    }
    res.status(500).json({ message: 'Error creating metric entry', error: error.message });
  }
};

// Controller function to update a metric entry
exports.updateMetricEntry = async (req, res) => {
  const { entryId } = req.params;
  const { value, entry_date, source } = req.body;
  const user_id = req.user.userId;

  logger.info(`Updating metric entry - ID: ${entryId}, User: ${user_id}`);

  if (value === undefined && entry_date === undefined && source === undefined) {
     logger.warn(`Metric entry update failed - No update fields provided for entry: ${entryId}`);
     return res.status(400).json({ message: 'No update fields provided.' });
  }

  try {
    const updatedEntry = await metricService.updateMetricEntry(user_id, entryId, { value, entry_date, source });
    logger.info(`Metric entry updated successfully - ID: ${entryId}, User: ${user_id}`);
    res.status(200).json({ success: true, message: 'Metric entry updated successfully', entry: updatedEntry });
  } catch (error) {
    logger.error('Error updating metric entry:', error);
    if (error.message === 'Metric entry not found or does not belong to the user') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error updating metric entry', error: error.message });
  }
};

// Controller function to delete a metric entry
exports.deleteMetricEntry = async (req, res) => {
  const { entryId } = req.params;
  const user_id = req.user.userId;

  logger.info(`Deleting metric entry - ID: ${entryId}, User: ${user_id}`);

  try {
    await metricService.deleteMetricEntry(user_id, entryId);
    logger.info(`Metric entry deleted successfully - ID: ${entryId}, User: ${user_id}`);
    res.status(200).json({ success: true, message: 'Metric entry deleted successfully' });
  } catch (error) {
    logger.error('Error deleting metric entry:', error);
    if (error.message === 'Metric entry not found or does not belong to the user') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error deleting metric entry', error: error.message });
  }
};