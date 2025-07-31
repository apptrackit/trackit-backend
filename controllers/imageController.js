const imageService = require('../services/imageService');

// Add image (expects req.body: { imageTypeId }, req.file.buffer, req.user.id)
const addImage = async (req, res) => {
  const logger = require('../utils/logger');
  try {
    logger.info('Received image upload request', { body: req.body, file: req.file, user: req.user });
    const { imageTypeId } = req.body;
    if (!req.user) {
      logger.error('No user found on request');
      return res.status(401).json({ error: 'Unauthorized: user not found' });
    }
    const userId = req.user.id;
    const data = req.file ? req.file.buffer : null;
    if (!imageTypeId || !data) {
      logger.warn('Missing imageTypeId or file data', { imageTypeId, hasFile: !!req.file });
      return res.status(400).json({ error: 'Missing imageTypeId or file data' });
    }
    const image = await imageService.addImage({ userId, imageTypeId, data });
    logger.info('Image uploaded and saved to DB', { image });
    res.status(201).json(image);
  } catch (err) {
    logger.error('Error uploading image', { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};

// Soft delete image (expects req.params.id, req.user.id)
const deleteImage = async (req, res) => {
  try {
    const imageId = req.params.id;
    const userId = req.user.id;
    const deleted = await imageService.softDeleteImage(imageId, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Image not found or already deleted' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addImage,
  deleteImage,
};
