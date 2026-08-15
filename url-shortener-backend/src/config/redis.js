const redis = require('redis');
const logger = require('../utils/logger');

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not set');
}

const parsedUrl = new URL(redisUrl);

const redisOptions = {
  host: parsedUrl.hostname,
  port: parseInt(parsedUrl.port || '6379', 10),

  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis connection refused');
    }

    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Redis retry time exhausted');
    }

    if (options.attempt > 10) {
      return undefined;
    }

    return Math.min(options.attempt * 100, 3000);
  },
};

// Add password if the Redis URL contains one
if (parsedUrl.password) {
  redisOptions.auth_pass = decodeURIComponent(parsedUrl.password);
}

// Select database if specified in URL
if (parsedUrl.pathname && parsedUrl.pathname !== '/') {
  redisOptions.db = parseInt(parsedUrl.pathname.substring(1), 10);
}

const redisClient = redis.createClient(redisOptions);

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', {
    message: err.message,
    code: err.code,
  });
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis reconnecting...');
});

module.exports = {
  get: (key) =>
    new Promise((resolve, reject) => {
      redisClient.get(key, (err, value) => {
        if (err) reject(err);
        else resolve(value);
      });
    }),

  set: (key, value, ttl = null) =>
    new Promise((resolve, reject) => {
      if (ttl) {
        redisClient.setex(key, ttl, value, (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      } else {
        redisClient.set(key, value, (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      }
    }),

  del: (key) =>
    new Promise((resolve, reject) => {
      redisClient.del(key, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    }),

  exists: (key) =>
    new Promise((resolve, reject) => {
      redisClient.exists(key, (err, result) => {
        if (err) reject(err);
        else resolve(result === 1);
      });
    }),

  incr: (key) =>
    new Promise((resolve, reject) => {
      redisClient.incr(key, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    }),

  expire: (key, ttl) =>
    new Promise((resolve, reject) => {
      redisClient.expire(key, ttl, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    }),

  flushDb: () =>
    new Promise((resolve, reject) => {
      redisClient.flushdb((err) => {
        if (err) reject(err);
        else resolve(true);
      });
    }),

  getClient: () => redisClient,
};