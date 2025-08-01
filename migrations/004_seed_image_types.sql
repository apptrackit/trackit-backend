-- 003_seed_image_types.sql
-- Seed default image types
INSERT INTO image_types (name)
SELECT t.name FROM (
  VALUES
    ('front'),
    ('back'),
    ('side'),
    ('biceps'),
    ('chest'),
    ('legs'),
    ('full body'),
    ('other')
) AS t(name)
WHERE NOT EXISTS (
  SELECT 1 FROM image_types WHERE image_types.name = t.name
);
