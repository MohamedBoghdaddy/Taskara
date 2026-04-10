// Redis configuration (optional - for caching/rate limiting)
// Install ioredis if needed: npm install ioredis

let redisClient = null;

const connectRedis = async () => {
  if (!process.env.REDIS_URL) {
    console.log('Redis not configured, skipping connection');
    return null;
  }

  try {
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL);

    redisClient.on('connect', () => console.log('Redis connected'));
    redisClient.on('error', (err) => console.error('Redis error:', err));

    return redisClient;
  } catch (err) {
    console.warn('Redis not available:', err.message);
    return null;
  }
};

const getRedisClient = () => redisClient;

module.exports = { connectRedis, getRedisClient };
