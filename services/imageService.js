const { db } = require('../database');

const getUserImages = async (userId, { limit = 100, offset = 0 }) => {
  const logger = require('../utils/logger');
  logger.info(`Getting images for user: ${userId}, limit: ${limit}, offset: ${offset}`);
  
  // Get images metadata (without the actual data)
  const result = await db.query(
    `SELECT i.id, i.image_type_id, i.uploaded_at, 
            LENGTH(i.data) as file_size,
            CASE 
              WHEN LENGTH(i.data) > 0 THEN 'image/jpeg'
              ELSE 'application/octet-stream'
            END as mime_type
     FROM images i
     WHERE i.user_id = $1 AND i.deleted = FALSE 
     ORDER BY i.uploaded_at DESC 
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
      id: row.id.toString(),
      image_type_id: row.image_type_id,
      filename: `image_${row.id}.jpg`, // Generate a filename
      date: row.uploaded_at.toISOString(),
      file_size: parseInt(row.file_size),
      mime_type: row.mime_type
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
