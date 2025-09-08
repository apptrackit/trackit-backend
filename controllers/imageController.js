const imageService = require('../services/imageService');

// Get user images (expects req.user.userId)
const getImages = async (req, res) => {
  const logger = require('../utils/logger');
  try {
    const userId = req.user.userId;
    const { limit = 100, offset = 0 } = req.query;
    
    logger.info(`Get images request - User: ${userId}, Limit: ${limit}, Offset: ${offset}`);
    
    const result = await imageService.getUserImages(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    logger.info(`Retrieved ${result.images.length} images for user: ${userId}`);
    res.status(200).json({
      success: true,
      images: result.images,
      total: result.total
    });
  } catch (err) {
    logger.error('Error getting images', { 
      error: err.message, 
      stack: err.stack,
      userId: req.user?.userId
    });
    res.status(500).json({ 
      success: false,
      error: err.message,
      showToast: true
    });
  }
};

const addImage = async (req, res) => {
  const logger = require('../utils/logger');
  try {
    const { imageTypeId, uploadedAt } = req.body;
    const userId = req.user.userId; // Use userId like metrics controller
    
    logger.info(`Image upload request - User: ${userId}, ImageTypeId: ${imageTypeId}, HasFile: ${!!req.file}, UploadedAt: ${uploadedAt}`);
    
    if (!userId) {
      logger.error('No userId found on request - authentication failed');
      return res.status(401).json({ 
        success: false,
        error: 'User not logged in',
        showToast: true
      });
    }

    const data = req.file ? req.file.buffer : null;
    if (!imageTypeId || !data) {
      logger.warn(`Image upload failed - Missing required fields for user: ${userId}`, { 
        imageTypeId: !!imageTypeId, 
        hasFileData: !!data,
        fileSize: data ? data.length : 0
      });
      return res.status(400).json({ 
        success: false,
        error: 'Missing imageTypeId or file data',
        showToast: true
      });
    }

    // Additional file size check (10MB = 10 * 1024 * 1024 bytes)
    const maxFileSize = 10 * 1024 * 1024;
    if (data.length > maxFileSize) {
      logger.warn(`Image upload failed - File too large: ${data.length} bytes for user: ${userId}`);
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum allowed size is 10MB.',
        code: 'FILE_TOO_LARGE',
        showToast: true
      });
    }

    logger.info(`Processing image upload - User: ${userId}, Type: ${imageTypeId}, Size: ${data.length} bytes`);
    const image = await imageService.addImage({ userId, imageTypeId, data, uploadedAt });
    
    logger.info(`Image upload successful - User: ${userId}, ImageId: ${image.id}`);
    res.status(201).json({
      success: true,
      id: image.id,
      user_id: image.user_id,
      image_type_id: image.image_type_id,
      uploaded_at: image.uploaded_at.toISOString(),
      deleted: image.deleted,
      message: 'Image uploaded successfully',
      showToast: true
    });
  } catch (err) {
    logger.error('Error uploading image', { 
      error: err.message, 
      stack: err.stack,
      userId: req.user?.userId,
      imageTypeId: req.body?.imageTypeId
    });
    res.status(500).json({ 
      success: false,
      error: err.message,
      showToast: true
    });
  }
};

// Soft delete image (expects req.params.id, req.user.id)
const deleteImage = async (req, res) => {
  const logger = require('../utils/logger');
  try {
    const imageId = req.params.id;
    const userId = req.user.userId; // Use userId like metrics controller
    
    logger.info(`Image delete request - User: ${userId}, ImageId: ${imageId}`);
    
    const deleted = await imageService.softDeleteImage(imageId, userId);
    if (!deleted) {
      logger.warn(`Image delete failed - not found or already deleted - User: ${userId}, ImageId: ${imageId}`);
      return res.status(404).json({ 
        success: false,
        error: 'Image not found or already deleted',
        showToast: true
      });
    }
    
    logger.info(`Image delete successful - User: ${userId}, ImageId: ${imageId}`);
    res.json({ 
      success: true,
      message: 'Image deleted successfully',
      showToast: true
    });
  } catch (err) {
    logger.error('Error deleting image', { 
      error: err.message, 
      stack: err.stack,
      userId: req.user?.userId,
      imageId: req.params?.id
    });
    res.status(500).json({ 
      success: false,
      error: err.message,
      showToast: true
    });
  }
};

// Download image file (expects req.params.id, req.user.userId)
const downloadImage = async (req, res) => {
  const logger = require('../utils/logger');
  try {
    const imageId = req.params.id;
    const userId = req.user.userId;
    
    logger.info(`Image download request - User: ${userId}, ImageId: ${imageId}`);
    
    const imageData = await imageService.getImageData(imageId, userId);
    if (!imageData) {
      logger.warn(`Image download failed - not found - User: ${userId}, ImageId: ${imageId}`);
      return res.status(404).json({ 
        success: false,
        error: 'Image not found',
        showToast: true
      });
    }
    
    logger.info(`Image download successful - User: ${userId}, ImageId: ${imageId}, Size: ${imageData.data.length} bytes`);
    
    // Set appropriate headers
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': imageData.data.length,
      'Content-Disposition': `attachment; filename="image_${imageId}.jpg"`
    });
    
    res.send(imageData.data);
  } catch (err) {
    logger.error('Error downloading image', { 
      error: err.message, 
      stack: err.stack,
      userId: req.user?.userId,
      imageId: req.params?.id
    });
    res.status(500).json({ 
      success: false,
      error: err.message,
      showToast: true
    });
  }
};

module.exports = {
  getImages,
  addImage,
  deleteImage,
  downloadImage,
};
