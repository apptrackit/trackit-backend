const jwt = require('jsonwebtoken');
const { db } = require('./database');
const crypto = require('crypto');
const logger = require('./utils/logger');

const validateApiKey = (req, res, next) => {
  // Check for API key in header
  const headerApiKey = req.headers['x-api-key'];
  // Check for API key in query parameter
  const queryApiKey = req.query.apiKey;
  
  const apiKey = headerApiKey || queryApiKey;
  
  if (!apiKey) {
    logger.warn('API key validation failed - No API key provided');
    return res.status(401).json({ error: 'API key is required' });
  }
  
  if (apiKey !== process.env.API_KEY) {
    logger.warn('API key validation failed - Invalid API key provided');
    return res.status(403).json({ error: 'Invalid API key' });
  }
  
  logger.info('API key validation successful');
  next();
};

const validateAdminApiKey = (req, res, next) => {
  const adminApiKey = req.headers['x-admin-api-key'];
  if (!adminApiKey || adminApiKey !== process.env.ADMIN_API_KEY) {
    logger.warn('Admin API key validation failed - Invalid or missing admin API key');
    return res.status(401).json({ success: false, error: 'Invalid admin API key' });
  }
  logger.info('Admin API key validation successful');
  next();
};

const validateToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    logger.warn('Token validation failed - No authentication token provided');
    return res.status(401).json({ error: 'Authentication token is required' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token exists in database and is not expired (Corrected for PostgreSQL)
    const sessionResult = await db.query(
      'SELECT * FROM sessions WHERE access_token = $1 AND access_token_expires_at > NOW()',
      [token]
    );

    const session = sessionResult.rows[0];

    if (!session) {
      logger.warn(`Token validation failed - Invalid or expired session for user: ${decoded.userId}`);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Add user info to request
    // Ensure the decoded userId matches the user_id in the session table for added security
    if (decoded.userId !== session.user_id) {
         logger.error(`Token validation failed - Token user ID mismatch: token=${decoded.userId}, session=${session.user_id}`);
         return res.status(401).json({ error: 'Token mismatch' });
    }

    req.user = {
      id: session.user_id, // Use user_id from the session table as the authoritative source
      username: decoded.username // Username can still come from the token payload
    };

    logger.info(`Token validation successful for user: ${decoded.username}`);
    next();

  } catch (error) {
    logger.error('Error in validateToken middleware:', error);
    // Specific error handling for invalid tokens
    if (error.name === 'TokenExpiredError') {
        logger.warn('Token validation failed - Token expired');
        return res.status(401).json({ error: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
        logger.warn('Token validation failed - Invalid token format');
        return res.status(401).json({ error: 'Invalid token' });
    } else {
        return res.status(500).json({ error: 'Internal server error during token validation' });
    }
  }
};

// Generate device ID from user agent and IP
const generateDeviceId = (req) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip = req.ip || 'unknown';
  return crypto.createHash('sha256').update(`${userAgent}${ip}`).digest('hex');
};

module.exports = {
  validateApiKey,
  validateAdminApiKey,
  validateToken,
  generateDeviceId
};
