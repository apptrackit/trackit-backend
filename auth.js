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
    
    // Check if token exists in database and is not expired
    db.get('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")', 
      [token], 
      (err, session) => {
        if (err) {
          console.error('Error checking session:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (!session) {
          return res.status(401).json({ error: 'Invalid or expired session' });
        }
        
        // Add user info to request
        req.user = {
          id: decoded.userId,
          username: decoded.username
        };
        
        next();
      }
    );
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
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
