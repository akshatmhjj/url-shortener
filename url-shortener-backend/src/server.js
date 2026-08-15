require('dotenv').config();
const http = require('http');
const app = require('./app');
const logger = require('./utils/logger');
const db = require('./config/database');
const redis = require('./config/redis');

const PORT = process.env.PORT || 3000;

let server;

const startServer = async () => {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    await db.query('SELECT 1');
    logger.info('✓ Database connected');

    // Test Redis connection
    logger.info('Testing Redis connection...');
    await redis.set('health_check', 'ok', 10);
    const check = await redis.get('health_check');
    if (check === 'ok') {
      logger.info('✓ Redis connected');
    }

    // Start HTTP server
    server = http.createServer(app);
    server.listen(PORT, () => {
      logger.info(`✓ Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API URL: ${process.env.API_URL}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Close database connections
      await db.pool.end();
      logger.info('Database connections closed');

      // Close Redis connection
      redis.getClient().quit(() => {
        logger.info('Redis connection closed');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Unhandled exception handler — crash is appropriate here since
    // the process is in an undefined state
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', { message: err.message, stack: err.stack });
      process.exit(1);
    });

    // Unhandled rejection handler — log and continue instead of crashing.
    // A single transient DB/Redis error should not kill the process.
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', {
        reason: reason instanceof Error ? { message: reason.message, stack: reason.stack } : reason,
      });
      // Do NOT process.exit here — the server can continue serving other requests.
    });
  } catch (err) {
    logger.error('Failed to start server:', { error: err.message, stack: err.stack });
    process.exit(1);
  }
};

startServer();

module.exports = app;
