const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const multer = require('multer');
const upload = multer();

// Middleware: assumes req.user is set by authentication middleware


/**
 * @swagger
 * /images:
 *   post:
 *     summary: Upload a new image
 *     tags:
 *       - Images
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
 *       500:
 *         description: Server error
 */
router.post('/', upload.single('file'), imageController.addImage);

/**
 * @swagger
 * /images/{id}:
 *   delete:
 *     summary: Soft delete an image
 *     tags:
 *       - Images
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
 *       404:
 *         description: Image not found or already deleted
 *       500:
 *         description: Server error
 */
router.delete('/:id', imageController.deleteImage);

module.exports = router;
