const express = require('express');
const path = require('path');
const app = express();
require('dotenv').config();
const logger = require('./utils/logger');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./utils/swagger');

// Middleware
app.use(express.json());

// Conditionally enable Swagger UI
const nodeEnv = process.env.NODE_ENV;
const isDevelopment = nodeEnv === 'dev' || nodeEnv === 'develop' || nodeEnv === 'development';

if (isDevelopment) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showCommonExtensions: true,
      tryItOutEnabled: true
    }
  }));
}

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

// Import images route
const imagesRouter = require('./routes/images');

// Use routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/images', imagesRouter);

// Start server only after database is initialized
initializeDatabase()
  .then(() => {
    const { db } = require('./database');
    
    // Cleanup expired admin tokens every hour
    setInterval(async () => {
      try {
        const result = await db.query('DELETE FROM admin_sessions WHERE expires_at <= NOW()');
        if (result.rowCount > 0) {
          logger.info(`Cleaned up ${result.rowCount} expired admin tokens`);
        }
      } catch (error) {
        logger.error('Error cleaning up expired admin tokens:', error);
      }
    }, 60 * 60 * 1000); // Run every hour

    logger.info('Admin token cleanup job started - running every hour');

    app.listen(process.env.PORT, process.env.HOST, () => {
      logger.info(`Server running on http://${process.env.HOST}:${process.env.PORT}`);
      if (isDevelopment) {
        logger.info(`Swagger UI available at http://${process.env.HOST}:${process.env.PORT}/api-docs`);
      }
    });
  })
  .catch((error) => {
    logger.error('Failed to initialize database, server not started:', error.message);
    process.exit(1);
  });