const { Pool } = require('pg');
const logger = require('./utils/logger');
require('dotenv').config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL
});


const fs = require('fs');
const path = require('path');

// Migration runner: runs all .sql files in migrations/ in order
const runMigrations = async () => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    logger.info('Starting migrations...');
    const migrationsDir = path.join(__dirname, 'migrations');
    // Only run numbered migrations first
    const files = fs.readdirSync(migrationsDir)
      .filter(f => /^\d+_.*\.sql$/.test(f))
      .sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      logger.info(`Running migration: ${file}`);
      await client.query(sql);
    }
    // Always run always_views.sql if it exists
    const alwaysViewsPath = path.join(migrationsDir, 'always_views.sql');
    if (fs.existsSync(alwaysViewsPath)) {
      const sql = fs.readFileSync(alwaysViewsPath, 'utf8');
      logger.info('Running always_views.sql');
      await client.query(sql);
    }
    await client.query('COMMIT');
    logger.info('All migrations and always_views.sql applied successfully.');
    client.release();
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Migration failed, rolled back:', err.message);
    client.release();
    throw err;
  }
};

// Run migrations on startup
const dbInitPromise = runMigrations();

process.on('SIGINT', async () => {
  await db.end();
  logger.info('Database connection closed');
  process.exit(0);
});

module.exports = { db, initializeDatabase: () => dbInitPromise };
