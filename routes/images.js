const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const { validateToken } = require('../auth');
const multer = require('multer');
const upload = multer();

// Protect these routes with authentication
router.use(validateToken);


/**
 * @swagger
 * /api/images:
 *   get:
 *     summary: Get user images
 *     tags: [Images]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of images to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of images to skip
 *     responses:
 *       200:
 *         description: Images retrieved successfully
 *       401:
 *         description: Invalid authentication
 *       500:
 *         description: Server error
 */
router.get('/', imageController.getImages);

/**
 * @swagger
 * /api/images:
 *   post:
 *     summary: Upload a new image
 *     tags: [Images]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               imageTypeId:
 *                 type: integer
 *             required:
 *               - file
 *               - imageTypeId
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *       400:
 *         description: Missing imageTypeId or file data
 *       401:
 *         description: Invalid authentication
 *       500:
 *         description: Server error
 */
router.post('/', upload.single('file'), imageController.addImage);

/**
 * @swagger
 * /api/images/{id}:
 *   delete:
 *     summary: Soft delete an image
 *     tags: [Images]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Image not found or already deleted
 *       500:
 *         description: Server error
 */
router.delete('/:id', imageController.deleteImage);

module.exports = router;
