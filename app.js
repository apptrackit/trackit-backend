const express = require('express');
const app = express();
require('dotenv').config();

// Middleware
app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

// Use routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

// Start server
app.listen(process.env.PORT, process.env.HOST, () => {
  console.log(`Server running on http://${process.env.HOST}:${process.env.PORT}`);
});