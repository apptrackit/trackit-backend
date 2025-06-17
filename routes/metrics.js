const express = require('express');
const router = express.Router();
const metricController = require('../controllers/metricController');
const { validateToken } = require('../auth');

// Protect these routes with authentication
router.use(validateToken);

/**
 * @swagger
 * /api/metrics:
 *   post:
 *     summary: Create a new metric entry
 *     tags: [Metrics]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: number
 *     responses:
 *       201:
 *         description: Metric entry created successfully
 *       401:
 *         description: Invalid authentication
 */
router.post('/', metricController.createMetricEntry);

/**
 * @swagger
 * /api/metrics/{entryId}:
 *   put:
 *     summary: Update a metric entry
 *     tags: [Metrics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: number
 *     responses:
 *       200:
 *         description: Metric entry updated successfully
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Metric entry not found
 */
router.put('/:entryId', metricController.updateMetricEntry);

/**
 * @swagger
 * /api/metrics/{entryId}:
 *   delete:
 *     summary: Delete a metric entry
 *     tags: [Metrics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Metric entry deleted successfully
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Metric entry not found
 */
router.delete('/:entryId', metricController.deleteMetricEntry);

module.exports = router; 