const imageService = require('../services/imageService');

// Add image (expects req.body: { imageTypeId }, req.file.buffer, req.user.id)
const addImage = async (req, res) => {
  try {
    const { imageTypeId } = req.body;
    const userId = req.user.id;
    const data = req.file.buffer;
    if (!imageTypeId || !data) {
      return res.status(400).json({ error: 'Missing imageTypeId or file data' });
    }
    const image = await imageService.addImage({ userId, imageTypeId, data });
    res.status(201).json(image);
  } catch (err) {
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
