const jwt = require('jsonwebtoken');
const db = require('./database');
const crypto = require('crypto');

const validateApiKey = (req, res, next) => {
  // Check for API key in header
  const headerApiKey = req.headers['x-api-key'];
  // Check for API key in query parameter
  const queryApiKey = req.query.apiKey;
  
  const apiKey = headerApiKey || queryApiKey;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }
  
  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  
  next();
};

const validateAdminApiKey = (req, res, next) => {
  const adminApiKey = req.headers['x-admin-api-key'];
  if (!adminApiKey || adminApiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ success: false, error: 'Invalid admin API key' });
  }
  next();
};

const validateToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
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
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Add user info to request
    // Ensure the decoded userId matches the user_id in the session table for added security
    if (decoded.userId !== session.user_id) {
         console.error('Token user ID does not match session user ID');
         return res.status(401).json({ error: 'Token mismatch' });
    }

    req.user = {
      id: session.user_id, // Use user_id from the session table as the authoritative source
      username: decoded.username // Username can still come from the token payload
    };

    next();

  } catch (error) {
    console.error('Error in validateToken middleware:', error);
    // Specific error handling for invalid tokens
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
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
