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

module.exports = { validateApiKey };
