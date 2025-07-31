const { db } = require('../database');

const addImage = async ({ userId, imageTypeId, data }) => {
  const result = await db.query(
    `INSERT INTO images (user_id, image_type_id, data) VALUES ($1, $2, $3) RETURNING *`,
    [userId, imageTypeId, data]
  );
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
  addImage,
  softDeleteImage,
};
