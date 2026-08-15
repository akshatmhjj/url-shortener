const redis = require('redis');
const logger = require('../utils/logger');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis reconnecting...');
});

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

module.exports = {
  connect: connectRedis,

  get: async (key) => {
    await connectRedis();
    return redisClient.get(key);
  },

  set: async (key, value, ttl = null) => {
    await connectRedis();

    if (ttl) {
      await redisClient.setEx(key, ttl, value);
    } else {
      await redisClient.set(key, value);
    }

    return true;
  },

  del: async (key) => {
    await connectRedis();
    return redisClient.del(key);
  },

  exists: async (key) => {
    await connectRedis();
    return (await redisClient.exists(key)) === 1;
  },

  incr: async (key) => {
    await connectRedis();
    return redisClient.incr(key);
  },

  expire: async (key, ttl) => {
    await connectRedis();
    return redisClient.expire(key, ttl);
  },

  flushDb: async () => {
    await connectRedis();
    await redisClient.flushDb();
    return true;
  },

  getClient: () => redisClient,
};