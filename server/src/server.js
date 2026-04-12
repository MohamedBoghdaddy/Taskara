require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { initSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;

// Create HTTP server so Socket.io can share the same port
const httpServer = http.createServer(app);

// Initialize Socket.io and attach to app for use in route handlers
const io = initSocket(httpServer);
app.set('io', io);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  connectDB().catch(err => console.error('DB connection failed:', err.message));
});
