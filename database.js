const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // e.g. postgres://user:password@host:port/database
});

(async () => {
  try {
    const client = await pool.connect();
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

    client.release();
  } catch (err) {
    console.error('Database error:', err.message);
  }
})();

process.on('SIGINT', async () => {
  await pool.end();
  console.log('Database connection pool closed');
  process.exit(0);
});

module.exports = pool;
