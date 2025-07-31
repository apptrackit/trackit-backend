-- 002_seed_default_metric_types.sql
-- Seed non-calculated default metric types
INSERT INTO metric_types (name, unit, icon_name, is_default, user_id, category)
SELECT name, unit, icon_name, TRUE, NULL, category FROM (
  VALUES
    ('Weight', 'kg', 'scalemass.fill', 'Body Measurement'),
    ('Height', 'cm', 'ruler.fill', 'Body Measurement'),
    ('Body Fat', '%', 'figure.arms.open', 'Body Measurement'),
    ('Waist', 'cm', 'figure.walk', 'Body Measurement'),
    ('Bicep', 'cm', 'figure.arms.open', 'Body Measurement'),
    ('Chest', 'cm', 'heart.fill', 'Body Measurement'),
    ('Thigh', 'cm', 'figure.walk', 'Body Measurement'),
    ('Shoulder', 'cm', 'figure.american.football', 'Body Measurement'),
    ('Glutes', 'cm', 'figure.cross.training', 'Body Measurement'),
    ('Calf', 'cm', 'figure.walk', 'Body Measurement'),
    ('Neck', 'cm', 'person.bust', 'Body Measurement'),
    ('Forearm', 'cm', 'figure.arms.open', 'Body Measurement')
) AS t(name, unit, icon_name, category)
WHERE NOT EXISTS (
  SELECT 1 FROM metric_types WHERE metric_types.name = t.name
);
