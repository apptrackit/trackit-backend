const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();


const dbPath = process.env.DB_PATH;

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
    return;
  }
  console.log('Connected to the SQLite database at', dbPath);
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing the database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

module.exports = db;
