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
 *               id:
 *                 type: string
 *                 description: Optional UUID for the entry (for sync purposes)
 *               metric_type_id:
 *                 type: integer
 *                 description: ID of the metric type (alternative to metric_type)
 *               metric_type:
 *                 type: string
 *                 description: Name of metric type (e.g., "weight", "steps")
 *               value:
 *                 type: number
 *                 description: The metric value
 *               unit:
 *                 type: string
 *                 description: Unit of measurement (e.g., "kg", "steps")
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: When the measurement was taken
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Alias for date
 *               source:
 *                 type: string
 *                 enum: [app, apple_health]
 *                 default: app
 *                 description: Source of the data
 *     responses:
 *       201:
 *         description: Metric entry created successfully
 *       400:
 *         description: Missing required fields
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
 *               unit:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               source:
 *                 type: string
 *                 enum: [app, apple_health]
 *               client_last_updated_at:
 *                 type: string
 *                 format: date-time
 *                 description: Client's last updated timestamp for conflict resolution
 *     responses:
 *       200:
 *         description: Metric entry updated successfully
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Metric entry not found
 *       409:
 *         description: Sync conflict - server data is newer
 *       410:
 *         description: Entry is deleted
 */
router.put('/:entryId', metricController.updateMetricEntry);

/**
 * @swagger
 * /api/metrics/{entryId}:
 *   delete:
 *     summary: Delete a metric entry (soft delete by default)
 *     tags: [Metrics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: hard_delete
 *         schema:
 *           type: boolean
 *           default: false
 *         description: If true, permanently delete the entry
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
 * /api/metrics/{entryId}/restore:
 *   post:
 *     summary: Restore a soft-deleted metric entry
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
 *         description: Metric entry restored successfully
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Metric entry not found or not deleted
 */
router.post('/:entryId/restore', metricController.restoreMetricEntry);

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: Get metric entries for the authenticated user
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
 *         name: metric_type
 *         schema:
 *           type: string
 *         description: Filter by metric type name (e.g., "weight", "steps")
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [app, apple_health]
 *         description: Filter by data source
 *       - in: query
 *         name: include_deleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include soft-deleted entries
 *       - in: query
 *         name: since_timestamp
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get entries modified since this timestamp
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
 *                       metric_type:
 *                         type: string
 *                       value:
 *                         type: number
 *                       unit:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       source:
 *                         type: string
 *                         enum: [app, apple_health]
 *                       last_updated_at:
 *                         type: string
 *                         format: date-time
 *                       is_deleted:
 *                         type: boolean
 *                 total:
 *                   type: integer
 *       401:
 *         description: Invalid authentication
 */
router.get('/', metricController.getMetricEntries);

/**
 * @swagger
 * /api/metrics/sync/changes:
 *   get:
 *     summary: Get changes since a specific timestamp (for sync)
 *     tags: [Metrics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: since_timestamp
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get changes since this timestamp
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: Maximum number of changes to return
 *     responses:
 *       200:
 *         description: Changes retrieved successfully
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
 *                       metric_type:
 *                         type: string
 *                       value:
 *                         type: number
 *                       unit:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       source:
 *                         type: string
 *                         enum: [app, apple_health]
 *                       last_updated_at:
 *                         type: string
 *                         format: date-time
 *                       is_deleted:
 *                         type: boolean
 *                 has_more:
 *                   type: boolean
 *                 server_timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Missing since_timestamp parameter
 *       401:
 *         description: Invalid authentication
 */
router.get('/sync/changes', metricController.getChangesSince);

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