const express = require('express');
const router = express.Router();
const metricController = require('../controllers/metricController');
const { validateToken, validateApiKey } = require('../auth');

// Protect these routes with authentication
router.use(validateApiKey, validateToken);

// POST /api/metrics - Log a new metric entry
router.post('/', metricController.createMetricEntry);

// PUT /api/metrics/:entryId - Edit a metric entry
router.put('/:entryId', metricController.updateMetricEntry);

// DELETE /api/metrics/:entryId - Delete a metric entry
router.delete('/:entryId', metricController.deleteMetricEntry);

module.exports = router; 