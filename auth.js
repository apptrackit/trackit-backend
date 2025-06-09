const jwt = require('jsonwebtoken');
const { db } = require('./database');
const logger = require('./utils/logger');

// Validate API key for regular endpoints
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    logger.warn(`Invalid API key attempt from ${req.ip}`);
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }
  
  next();
};

// Validate token for authenticated endpoints
const validateToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    logger.warn(`Missing access token from ${req.ip}`);
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    logger.info(`Token validated for user ${decoded.userId}`);
    next();
  } catch (error) {
    logger.warn(`Invalid token attempt from ${req.ip}: ${error.message}`);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

// Legacy admin API key validation (kept for backward compatibility)
const validateAdminApiKey = (req, res, next) => {
  const adminApiKey = req.headers['x-admin-api-key'];
  
  if (!adminApiKey || adminApiKey !== process.env.ADMIN_API_KEY) {
    logger.warn(`Invalid admin API key attempt from ${req.ip}`);
    return res.status(401).json({ success: false, error: 'Invalid admin API key' });
  }
  
  logger.info(`Admin API key validated from ${req.ip}`);
  next();
};

// Validate admin bearer token
const validateAdminToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn(`Missing admin bearer token from ${req.ip}`);
    return res.status(401).json({ success: false, error: 'Bearer token required' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const result = await db.query(
      'SELECT * FROM admin_sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      logger.warn(`Invalid or expired admin token attempt from ${req.ip}`);
      return res.status(401).json({ success: false, error: 'Invalid or expired admin token' });
    }

    const session = result.rows[0];
    req.adminUser = { username: session.username };
    logger.info(`Admin token validated for ${session.username} from ${req.ip}`);
    next();
  } catch (error) {
    logger.error(`Error validating admin token from ${req.ip}:`, error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Generate device ID
const generateDeviceId = (req) => {
  const crypto = require('crypto');
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip = req.ip || 'unknown';
  return crypto.createHash('sha256').update(`${userAgent}${ip}`).digest('hex');
};

module.exports = {
  validateApiKey,
  validateToken,
  validateAdminApiKey,
  validateAdminToken,
  generateDeviceId
};
