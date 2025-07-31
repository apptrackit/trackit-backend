-- 001_create_tables.sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  device_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token_expires_at TIMESTAMP NOT NULL,
  refresh_token_expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_refresh_at TIMESTAMP,
  last_check_at TIMESTAMP,
  refresh_count INTEGER DEFAULT 0,
  UNIQUE(user_id, device_id)
);

-- Create admin_sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- Create metric_types table
CREATE TABLE IF NOT EXISTS metric_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  unit VARCHAR(50),
  icon_name VARCHAR(50),
  is_default BOOLEAN DEFAULT FALSE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(100)
);

-- Create metric_entries table
CREATE TABLE IF NOT EXISTS metric_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type_id INTEGER NOT NULL REFERENCES metric_types(id) ON DELETE CASCADE,
  value DECIMAL(10, 2) NOT NULL,
  date TIMESTAMP NOT NULL,
  is_apple_health BOOLEAN DEFAULT FALSE
);

-- Ensure unique constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_metric_date'
  ) THEN
    ALTER TABLE metric_entries
    ADD CONSTRAINT unique_user_metric_date UNIQUE (user_id, metric_type_id, date);
  END IF;
END
$$;
