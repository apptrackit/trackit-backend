-- 004_create_image_tables.sql
-- Create image_types table
CREATE TABLE IF NOT EXISTS image_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Create images table
CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_type_id INTEGER NOT NULL REFERENCES image_types(id) ON DELETE RESTRICT,
  data BYTEA NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP
);
