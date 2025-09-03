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
 *               - metric_type_id
 *               - client_uuid
 *               - value
 *               - entry_date
 *             properties:
 *               metric_type_id:
 *                 type: integer
 *               client_uuid:
 *                 type: string
 *               value:
 *                 type: number
 *               entry_date:
 *                 type: string
 *                 format: date
 *               source:
 *                 type: string
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
 *             properties:
 *               value:
 *                 type: number
 *               entry_date:
 *                 type: string
 *                 format: date
 *               source:
 *                 type: string
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

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: Get all metric entries for the authenticated user
 *     tags: [Metrics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: metric_type_id
 *         schema:
 *           type: integer
 *         description: Filter by specific metric type ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of entries to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of entries to skip
 *     responses:
 *       200:
 *         description: Metric entries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 entries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       metric_type_id:
 *                         type: integer
 *                       client_uuid:
 *                         type: string
 *                       value:
 *                         type: number
 *                       entry_date:
 *                         type: string
 *                         format: date
 *                       source:
 *                         type: string
 *                       version:
 *                         type: integer
 *                       created_at:
 *                         type: string
 *                       updated_at:
 *                         type: string
 *                 total:
 *                   type: integer
 *       401:
 *         description: Invalid authentication
 */
router.get('/', metricController.getMetricEntries);

/**
 * @swagger
 * /api/metrics/types:
 *   get:
 *     summary: Get all available metric types
 *     tags: [Metrics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Metric types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 types:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       unit:
 *                         type: string
 *                       description:
 *                         type: string
 *       401:
 *         description: Invalid authentication
 */
router.get('/types', metricController.getMetricTypes);

module.exports = router;