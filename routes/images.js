const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const { validateToken } = require('../auth');
const multer = require('multer');
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB in bytes
  }
});

// Multer error handling middleware
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum allowed size is 10MB.',
        code: 'FILE_TOO_LARGE'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'File upload error: ' + error.message,
      code: error.code
    });
  }
  next(error);
};

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
 * /api/images/{id}/download:
 *   get:
 *     summary: Download image file
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
 *         description: Image file
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Image not found
 *       500:
 *         description: Server error
 */
router.get('/:id/download', imageController.downloadImage);

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
 *                 description: Image file (max 10MB)
 *               imageTypeId:
 *                 type: integer
 *             required:
 *               - file
 *               - imageTypeId
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *       400:
 *         description: Missing imageTypeId or file data, or file too large
 *       401:
 *         description: Invalid authentication
 *       500:
 *         description: Server error
 */
router.post('/', upload.single('file'), handleMulterError, imageController.addImage);

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
