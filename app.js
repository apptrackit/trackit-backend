const express = require('express');
const path = require('path');
const app = express();
require('dotenv').config();
const logger = require('./utils/logger');

// Middleware
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the landing page at the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const metricsRoutes = require('./routes/metrics');
const { initializeDatabase } = require('./database');

// Use routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/api/metrics', metricsRoutes);

// Start server only after database is initialized
initializeDatabase()
  .then(() => {
    app.listen(process.env.PORT, process.env.HOST, () => {
      logger.info(`Server running on http://${process.env.HOST}:${process.env.PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Failed to initialize database, server not started:', error.message);
    process.exit(1);
  });