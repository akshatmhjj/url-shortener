require('dotenv').config();
const express = require('express');
const logger = require('./utils/logger');
const middleware = require('./middleware');
const db = require('./config/database');
const redis = require('./config/redis');

// Import routes
const redirectRoutes = require('./routes/redirectRoutes');
const urlRoutes = require('./routes/urlRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Request ID must be first to tag all subsequent logs
app.use(middleware.requestId);

// Middleware stack
app.use(middleware.securityHeaders);
app.use(middleware.corsMiddleware);
app.use(middleware.requestLogger);
app.use(express.json({ limit: '10mb' }));
app.use(middleware.limiter);

// Health check endpoint — verifies DB and Redis connectivity
app.get('/health', async (req, res) => {
  const checks = { db: 'ok', redis: 'ok' };
  let healthy = true;

  try {
    await db.query('SELECT 1');
  } catch (err) {
    checks.db = 'error';
    healthy = false;
    logger.error('Health check: DB unreachable', { error: err.message });
  }

  try {
    await redis.set('health_check', 'ok', 10);
    const val = await redis.get('health_check');
    if (val !== 'ok') {
      checks.redis = 'error';
      healthy = false;
    }
  } catch (err) {
    checks.redis = 'error';
    healthy = false;
    logger.error('Health check: Redis unreachable', { error: err.message });
  }

  const statusCode = healthy ? 200 : 503;
  res.status(statusCode).json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks,
  });
});

// API Routes
const apiVersion = process.env.API_VERSION || 'v1';

// Apply validateContentType only to API routes that accept JSON bodies
app.use(`/api/${apiVersion}/auth`, middleware.validateContentType, authRoutes);
app.use(`/api/${apiVersion}`, middleware.validateContentType, urlRoutes);
  
// Analytics routes
app.use(`/api/${apiVersion}/analytics`, analyticsRoutes);

// Redirect route (must be after /api routes to catch short codes)
app.use('/', redirectRoutes);

// Documentation endpoint
app.get(`/api/${apiVersion}/docs`, (req, res) => {
  res.json({
    version: apiVersion,
    baseUrl: process.env.API_URL,
    endpoints: {
      shorten: {
        method: 'POST',
        path: '/api/v1/shorten',
        description: 'Create a shortened URL',
        body: {
          url: 'string (required)',
          custom_alias: 'string (optional)',
          title: 'string (optional)',
          ttl: 'number (optional, seconds)',
        },
      },
      redirect: {
        method: 'GET',
        path: '/:shortCode',
        description: 'Redirect to original URL',
      },
      analytics: {
        method: 'GET',
        path: '/api/v1/analytics/:shortCode',
        description: 'Get URL analytics',
        query: {
          period: 'string (7d, 30d, 90d, 1y, all)',
        },
      },
      getUserUrls: {
        method: 'GET',
        path: '/api/v1/urls',
        description: 'List user URLs',
        auth: 'required',
      },
      deleteUrl: {
        method: 'DELETE',
        path: '/api/v1/urls/:id',
        description: 'Delete a URL',
        auth: 'required',
      },
    },
  });
});

// 404 Not Found handler (must be after all routes)
app.use(middleware.notFound);

// Global error handler (must be last)
app.use(middleware.errorHandler);

module.exports = app;
