const express = require('express');
const db = require('./database');
const { validateApiKey } = require('./auth');
const app = express();

// Add this line to parse JSON request bodies
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

  // Log the request body to debug
  console.log('Request body:', req.body);

  db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, password], function(err) {
    if (err) {
      console.error('Error inserting into database:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ id: this.lastID });
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});