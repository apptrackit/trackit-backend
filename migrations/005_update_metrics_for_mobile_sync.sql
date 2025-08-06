-- 005_update_metrics_for_mobile_sync.sql
-- Update metric_entries table to support iOS + Android syncing

-- First, let's add the new columns step by step

-- Add source column to replace is_apple_health with more flexible options
ALTER TABLE metric_entries ADD COLUMN IF NOT EXISTS source TEXT;

-- Add last_updated_at column for conflict resolution
ALTER TABLE metric_entries ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add is_deleted column for soft deletes
ALTER TABLE metric_entries ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add unit column for flexible unit storage
ALTER TABLE metric_entries ADD COLUMN IF NOT EXISTS unit TEXT;

-- Add metric_type column to eventually replace metric_type_id
ALTER TABLE metric_entries ADD COLUMN IF NOT EXISTS metric_type TEXT;

-- Populate the new columns with data from existing columns
-- Convert is_apple_health to source
UPDATE metric_entries 
SET source = CASE 
  WHEN is_apple_health = TRUE THEN 'apple_health'
  ELSE 'app'
END
WHERE source IS NULL;

-- Set last_updated_at to date for existing records
UPDATE metric_entries 
SET last_updated_at = date
WHERE last_updated_at IS NULL;

-- Populate metric_type from metric_types table
UPDATE metric_entries 
SET metric_type = mt.name
FROM metric_types mt
WHERE metric_entries.metric_type_id = mt.id
AND metric_entries.metric_type IS NULL;

-- Populate unit from metric_types table
UPDATE metric_entries 
SET unit = COALESCE(mt.unit, '')
FROM metric_types mt
WHERE metric_entries.metric_type_id = mt.id
AND metric_entries.unit IS NULL;

-- Make the new columns NOT NULL after populating them
ALTER TABLE metric_entries ALTER COLUMN source SET NOT NULL;
ALTER TABLE metric_entries ALTER COLUMN last_updated_at SET NOT NULL;
ALTER TABLE metric_entries ALTER COLUMN is_deleted SET NOT NULL;
ALTER TABLE metric_entries ALTER COLUMN unit SET NOT NULL;
ALTER TABLE metric_entries ALTER COLUMN metric_type SET NOT NULL;

-- Add check constraint for valid source values
ALTER TABLE metric_entries ADD CONSTRAINT check_source_values 
CHECK (source IN ('app', 'apple_health'));

-- Add index on source for better query performance
CREATE INDEX IF NOT EXISTS idx_metric_entries_source ON metric_entries(source);

-- Add index on is_deleted for filtering active entries
CREATE INDEX IF NOT EXISTS idx_metric_entries_not_deleted ON metric_entries(is_deleted) WHERE is_deleted = FALSE;

-- Add index on last_updated_at for sync operations
CREATE INDEX IF NOT EXISTS idx_metric_entries_last_updated ON metric_entries(last_updated_at);

-- Add composite index for user queries filtering by deleted status
CREATE INDEX IF NOT EXISTS idx_metric_entries_user_active ON metric_entries(user_id, is_deleted, date DESC);

-- Update the unique constraint to include is_deleted (so deleted entries don't conflict)
-- First drop the old constraint
ALTER TABLE metric_entries DROP CONSTRAINT IF EXISTS unique_user_metric_date;

-- Add new constraint that allows multiple deleted entries but ensures uniqueness for active ones
-- We'll use a partial unique index instead of a constraint for more flexibility
DROP INDEX IF EXISTS idx_unique_user_metric_date_active;
CREATE UNIQUE INDEX idx_unique_user_metric_date_active 
ON metric_entries(user_id, metric_type_id, date) 
WHERE is_deleted = FALSE;

-- Add trigger to automatically update last_updated_at on changes
CREATE OR REPLACE FUNCTION update_last_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for metric_entries
DROP TRIGGER IF EXISTS trg_metric_entries_last_updated ON metric_entries;
CREATE TRIGGER trg_metric_entries_last_updated
  BEFORE UPDATE ON metric_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated_at();

-- Create a view for active (non-deleted) entries for easier querying
CREATE OR REPLACE VIEW active_metric_entries AS
SELECT 
  id,
  user_id,
  metric_type_id,
  metric_type,
  value,
  unit,
  date AS timestamp,
  source,
  last_updated_at,
  is_deleted
FROM metric_entries
WHERE is_deleted = FALSE;

-- Add comments to document the new columns
COMMENT ON COLUMN metric_entries.source IS 'Data source: "app" for manually entered data, "apple_health" for HealthKit data';
COMMENT ON COLUMN metric_entries.last_updated_at IS 'Timestamp of last modification, used for sync conflict resolution';
COMMENT ON COLUMN metric_entries.is_deleted IS 'Soft delete flag - true means user deleted this entry';
COMMENT ON COLUMN metric_entries.unit IS 'Unit of measurement (e.g., "kg", "steps", "hours")';
COMMENT ON COLUMN metric_entries.metric_type IS 'Type of metric as text (e.g., "weight", "steps", "sleep")';