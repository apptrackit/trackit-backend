CREATE OR REPLACE VIEW images_with_users AS
SELECT 
  i.id,
  i.user_id,
  u.username,
  i.image_type_id,
  it.name AS image_type_name,
  i.uploaded_at,
  i.deleted,
  i.deleted_at
FROM images i
JOIN users u ON i.user_id = u.id
JOIN image_types it ON i.image_type_id = it.id;
