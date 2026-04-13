require('dotenv').config();
const http = require('http');
const app  = require('./app');
const { connectDB }        = require('./config/db');
const { initSocket }       = require('./config/socket');
const { connectRedis }     = require('./config/redis');
const { initQueues }       = require('./jobs/queues');
const { startSchedulers }  = require('./jobs/schedulers');

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

// Initialize Socket.io
const io = initSocket(httpServer);
app.set('io', io);

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[Server] Port ${PORT} is already in use.`);
    console.error(`[Server] Kill the existing process or set a different PORT in .env, then restart.\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

httpServer.listen(PORT, async () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);

  // Connect DB
  await connectDB().catch(err => console.error('DB connection failed:', err.message));

  // Connect Redis (optional) + start background jobs
  const redisClient = await connectRedis();
  if (redisClient) {
    initQueues(redisClient);
  }
  await startSchedulers(redisClient).catch(err =>
    console.warn('[Schedulers] Could not start schedulers:', err.message)
  );
});
