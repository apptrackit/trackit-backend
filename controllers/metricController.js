const db = require('../database');

// Controller function to log a new metric entry
exports.createMetricEntry = async (req, res) => {
  const { metric_type_id, value, date, is_apple_health = false } = req.body;
  const user_id = req.user.id;

  if (!metric_type_id || value === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields: metric_type_id, value, and date.' });
  }

  try {
    // Check if the metric_type_id exists
    const typeCheck = await db.query('SELECT id FROM metric_types WHERE id = $1', [metric_type_id]);
    if (typeCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Metric type not found.' });
    }

    const result = await db.query(
      `INSERT INTO metric_entries (user_id, metric_type_id, value, date, is_apple_health)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [user_id, metric_type_id, value, date, is_apple_health]
    );

    res.status(201).json({ success: true, message: 'Metric entry created successfully', entryId: result.rows[0].id });
  } catch (err) {
    console.error('Error creating metric entry:', err);
    res.status(500).json({ message: 'Error creating metric entry', error: err.message });
  }
};

// Controller function to update a metric entry
exports.updateMetricEntry = async (req, res) => {
  const { entryId } = req.params;
  const { value, date, is_apple_health } = req.body; // Allow updating these fields
  const user_id = req.user.id;

  if (value === undefined && date === undefined && is_apple_health === undefined) {
     return res.status(400).json({ message: 'No update fields provided.' });
  }

  // Build the update query dynamically based on provided fields
  const updateFields = [];
  const queryParams = [user_id, entryId];
  let paramIndex = 3; // Start index for value, date, is_apple_health

  if (value !== undefined) {
    updateFields.push(`value = $${paramIndex++}`);
    queryParams.push(value);
  }
  if (date !== undefined) {
    updateFields.push(`date = $${paramIndex++}`);
    queryParams.push(date);
  }
  if (is_apple_health !== undefined) {
     updateFields.push(`is_apple_health = $${paramIndex++}`);
     queryParams.push(is_apple_health);
  }

  if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
  }

  try {
    const query = `UPDATE metric_entries SET ${updateFields.join(', ')} WHERE id = $2 AND user_id = $1 RETURNING id`;

    const result = await db.query(query, queryParams);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Metric entry not found or does not belong to the user.' });
    }

    res.status(200).json({ success: true, message: 'Metric entry updated successfully' });
  } catch (err) {
    console.error('Error updating metric entry:', err);
    res.status(500).json({ message: 'Error updating metric entry', error: err.message });
  }
};

// Controller function to delete a metric entry
exports.deleteMetricEntry = async (req, res) => {
  const { entryId } = req.params;
  const user_id = req.user.id;

  try {
    const result = await db.query(
      'DELETE FROM metric_entries WHERE id = $1 AND user_id = $2 RETURNING id',
      [entryId, user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Metric entry not found or does not belong to the user.' });
    }

    res.status(200).json({ success: true, message: 'Metric entry deleted successfully' });
  } catch (err) {
    console.error('Error deleting metric entry:', err);
    res.status(500).json({ message: 'Error deleting metric entry', error: err.message });
  }
}; 