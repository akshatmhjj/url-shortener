const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Security headers middleware (using helmet)
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * CORS middleware
 */
const corsMiddleware = cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
});

/**
 * Request ID middleware - assigns a unique ID to each request for tracing
 */
const requestId = (req, res, next) => {
  req.id = req.get('x-request-id') || crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  next();
};

/**
 * Request logging middleware
 */
const requestLogger = morgan((tokens, req, res) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    requestId: req.id,
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    responseTime: tokens['response-time'](req, res),
    userAgent: req.get('user-agent'),
    ip: req.ip,
  });
});

/**
 * Rate limiting middleware (token bucket algorithm)
 */
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 1000 || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Error handling middleware
 * In production, only sends generic error messages to prevent leaking internals.
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', {
    requestId: req.id,
    message: err.message,
    stack: err.stack,
    url: req.url,
  });

  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(status).json({
    success: false,
    error: isProduction && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error',
    ...(req.id && { requestId: req.id }),
  });
};

/**
 * 404 Not Found middleware
 */
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
};

/**
 * Request validation middleware
 * Only validates Content-Type for requests that are expected to have a JSON body.
 */
const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        error: 'Content-Type must be application/json',
      });
    }
  }
  next();
};

/**
 * Authentication middleware (JWT)
 * Verifies the Bearer token and attaches the decoded user payload to req.user.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.get('authorization');
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Missing authorization header',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Invalid authorization header format. Expected: Bearer <token>',
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.sub || decoded.id,
      role: decoded.role || 'user',
      email: decoded.email,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token has expired',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid or malformed token',
    });
  }
};

/**
 * Optional Authentication middleware (JWT)
 * If a token is provided, it verifies it and attaches req.user.
 * If not, it lets the request proceed without error.
 */
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.get('authorization');
  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next();
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.sub || decoded.id,
      role: decoded.role || 'user',
      email: decoded.email,
    };
  } catch (err) {
    logger.debug('Optional auth token validation skipped or failed:', err.message);
  }
  next();
};

/**
 * Async error wrapper for route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  securityHeaders,
  corsMiddleware,
  requestId,
  requestLogger,
  limiter,
  errorHandler,
  notFound,
  validateContentType,
  authenticate,
  optionalAuthenticate,
  asyncHandler,
};

