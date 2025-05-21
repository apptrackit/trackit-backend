const express = require('express');
const db = require('./database');
const { validateApiKey } = require('./auth');
const app = express();
require('dotenv').config();

app.use(express.json());

app.get('/', validateApiKey, (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
      console.error('Error querying database:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.post('/register', validateApiKey, (req, res) => {
  const { username, email, password } = req.body;

  console.log('Request body:', req.body);

  db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, password], function(err) {
    if (err) {
      console.error('Error inserting into database:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ id: this.lastID });
  });
});

app.listen(process.env.PORT, () => {
  console.log('Server running on port', process.env.PORT);
});