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
    res.status(500).json({ error: err.message });
  }
};

// Add image (expects req.body: { imageTypeId }, req.file.buffer, req.user.id)
const addImage = async (req, res) => {
  const logger = require('../utils/logger');
  try {
    const { imageTypeId } = req.body;
    const userId = req.user.userId; // Use userId like metrics controller
    
    logger.info(`Image upload request - User: ${userId}, ImageTypeId: ${imageTypeId}, HasFile: ${!!req.file}`);
    
    if (!userId) {
      logger.error('No userId found on request - authentication failed');
      return res.status(401).json({ error: 'User not logged in' });
    }

    const data = req.file ? req.file.buffer : null;
    if (!imageTypeId || !data) {
      logger.warn(`Image upload failed - Missing required fields for user: ${userId}`, { 
        imageTypeId: !!imageTypeId, 
        hasFileData: !!data,
        fileSize: data ? data.length : 0
      });
      return res.status(400).json({ error: 'Missing imageTypeId or file data' });
    }

    logger.info(`Processing image upload - User: ${userId}, Type: ${imageTypeId}, Size: ${data.length} bytes`);
    const image = await imageService.addImage({ userId, imageTypeId, data });
    
    logger.info(`Image upload successful - User: ${userId}, ImageId: ${image.id}`);
    res.status(201).json(image);
  } catch (err) {
    logger.error('Error uploading image', { 
      error: err.message, 
      stack: err.stack,
      userId: req.user?.userId,
      imageTypeId: req.body?.imageTypeId
    });
    res.status(500).json({ error: err.message });
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
      return res.status(404).json({ error: 'Image not found or already deleted' });
    }
    
    logger.info(`Image delete successful - User: ${userId}, ImageId: ${imageId}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('Error deleting image', { 
      error: err.message, 
      stack: err.stack,
      userId: req.user?.userId,
      imageId: req.params?.id
    });
    res.status(500).json({ error: err.message });
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
      return res.status(404).json({ error: 'Image not found' });
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
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getImages,
  addImage,
  deleteImage,
  downloadImage,
};
