const express = require('express');
const db = require('./database');
const { validateApiKey } = require('./auth');
const app = express();

app.get('/', validateApiKey, (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
      console.error('Error querying database:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});