const { Pool } = require('pg');
require('dotenv').config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL, // e.g. postgres://user:password@host:port/database
});

(async () => {
  try {
    const client = await db.connect();
    console.log('Connected to the PostgreSQL database');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Users table ready');

    await client.query(`
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
    `);
    console.log('Sessions table ready');


    // Create metric_types table
    await client.query(`
      CREATE TABLE IF NOT EXISTS metric_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        unit VARCHAR(50),
        icon_name VARCHAR(50),
        is_default BOOLEAN DEFAULT FALSE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(100)
      );
    `);
    console.log('Metric types table ready');

    // Define non-calculated default metric types based on Swift enum
    const nonCalculatedDefaultMetricTypes = [
      { name: 'Weight', unit: 'kg', icon_name: 'scalemass.fill', category: 'Body Measurement' },
      { name: 'Height', unit: 'cm', icon_name: 'ruler.fill', category: 'Body Measurement' },
      { name: 'Body Fat', unit: '%', icon_name: 'figure.arms.open', category: 'Body Measurement' },
      { name: 'Waist', unit: 'cm', icon_name: 'figure.walk', category: 'Body Measurement' },
      { name: 'Bicep', unit: 'cm', icon_name: 'figure.arms.open', category: 'Body Measurement' },
      { name: 'Chest', unit: 'cm', icon_name: 'heart.fill', category: 'Body Measurement' },
      { name: 'Thigh', unit: 'cm', icon_name: 'figure.walk', category: 'Body Measurement' },
      { name: 'Shoulder', unit: 'cm', icon_name: 'figure.american.football', category: 'Body Measurement' },
      { name: 'Glutes', unit: 'cm', icon_name: 'figure.cross.training', category: 'Body Measurement' },
      { name: 'Calf', unit: 'cm', icon_name: 'figure.walk', category: 'Body Measurement' },
      { name: 'Neck', unit: 'cm', icon_name: 'person.bust', category: 'Body Measurement' },
      { name: 'Forearm', unit: 'cm', icon_name: 'figure.arms.open', category: 'Body Measurement' },
    ];

    // Seed default metric types if they don't exist
    for (const type of nonCalculatedDefaultMetricTypes) {
      const existing = await client.query(
        'SELECT id FROM metric_types WHERE name = $1',
        [type.name]
      );

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO metric_types (name, unit, icon_name, is_default, user_id, category)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [type.name, type.unit, type.icon_name, true, null, type.category]
        );
        console.log(`Seeded default metric type: ${type.name}`);
      } else {
        console.log(`Default metric type already exists: ${type.name}`);
      }
    }
    console.log('Default metric types seeding process completed.');

    // Create metric_entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS metric_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        metric_type_id INTEGER NOT NULL REFERENCES metric_types(id) ON DELETE CASCADE,
        value BIGINT NOT NULL,
        date DATE NOT NULL,
        is_apple_health BOOLEAN DEFAULT FALSE
      );
    `);
    console.log('Metric entries table ready');

    client.release();
  } catch (err) {
    console.error('Database error:', err.message);
  }
})();

process.on('SIGINT', async () => {
  await db.end();
  console.log('Database connection closed');
  process.exit(0);
});

module.exports = db;
