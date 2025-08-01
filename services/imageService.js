const { db } = require('../database');

const getUserImages = async (userId, { limit = 100, offset = 0 }) => {
  const logger = require('../utils/logger');
  logger.info(`Getting images for user: ${userId}, limit: ${limit}, offset: ${offset}`);
  
  // Get images without the actual data (just metadata)
  const result = await db.query(
    `SELECT id, user_id, image_type_id, created_at, updated_at 
     FROM images 
     WHERE user_id = $1 AND deleted = FALSE 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  
  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM images WHERE user_id = $1 AND deleted = FALSE`,
    [userId]
  );
  
  logger.info(`Retrieved ${result.rows.length} images for user: ${userId}`);
  
  return {
    images: result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      image_type_id: row.image_type_id,
      created_at: row.created_at,
      updated_at: row.updated_at
    })),
    total: parseInt(countResult.rows[0].total)
  };
};

const addImage = async ({ userId, imageTypeId, data }) => {
  const logger = require('../utils/logger');
  logger.info('Inserting image into DB', { userId, imageTypeId, dataLength: data ? data.length : 0 });
  const result = await db.query(
    `INSERT INTO images (user_id, image_type_id, data) VALUES ($1, $2, $3) RETURNING *`,
    [userId, imageTypeId, data]
  );
  logger.info('Image insert result', { result: result.rows[0] });
  return result.rows[0];
};

const softDeleteImage = async (imageId, userId) => {
  const result = await db.query(
    `UPDATE images SET deleted = TRUE, deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted = FALSE RETURNING *`,
    [imageId, userId]
  );
  return result.rows[0];
};

module.exports = {
  getUserImages,
  addImage,
  softDeleteImage,
};
