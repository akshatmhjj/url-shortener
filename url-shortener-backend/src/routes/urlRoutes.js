const express = require('express');
const router = express.Router();
const URLModel = require('../models/urlModel');
const ClickModel = require('../models/clickModel');
const cache = require('../config/redis');
const logger = require('../utils/logger');
const { validateShortenRequest, isUrlBlacklisted, sanitizeUrl, isValidAlias } = require('../utils/validators');
const { encodeCounter } = require('../utils/encoding');
const { authenticate, optionalAuthenticate, asyncHandler } = require('../middleware');

/**
 * POST /api/v1/shorten
 * Create a shortened URL
 */
router.post('/shorten', optionalAuthenticate, asyncHandler(async (req, res) => {
  const { error, value } = validateShortenRequest(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details.map((d) => ({ field: d.path[0], message: d.message })),
    });
  }

  const { url, custom_alias, title, ttl } = value;
  const userId = req.user ? req.user.id : null;

  // Check if URL is blacklisted
  if (isUrlBlacklisted(url)) {
    return res.status(400).json({
      success: false,
      error: 'This URL is not allowed',
    });
  }

  const sanitizedUrl = sanitizeUrl(url);

  // Check if custom alias is provided and available
  let shortCode = null;
  if (custom_alias) {
    if (!isValidAlias(custom_alias)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid custom alias format',
      });
    }

    const aliasExists = await URLModel.customAliasExists(custom_alias);
    if (aliasExists) {
      return res.status(409).json({
        success: false,
        error: 'Custom alias already taken',
      });
    }

    shortCode = custom_alias;
  } else {
    // Generate short code using counter (collision-free)
    const counter = await URLModel.getNextCounter();
    shortCode = encodeCounter(counter);
  }

  // Create the URL
  const urlRecord = await URLModel.create(userId, sanitizedUrl, shortCode, custom_alias, title, ttl);

  // Cache the URL for fast redirect
  await cache.set(
    `url:${shortCode}`,
    JSON.stringify({
      id: urlRecord.id,
      short_code: urlRecord.short_code,
      original_url: urlRecord.original_url,
    }),
    86400 // 24 hour TTL
  );

  logger.info('URL shortened', { userId, shortCode });

  return res.status(201).json({
    success: true,
    data: {
      id: urlRecord.id,
      short_code: urlRecord.short_code,
      short_url: `${process.env.API_URL}/${urlRecord.short_code}`,
      original_url: urlRecord.original_url,
      created_at: urlRecord.created_at,
      expires_at: urlRecord.expires_at,
      qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${process.env.API_URL}/${urlRecord.short_code}`,
    },
  });
}));

/**
 * GET /api/v1/urls/:id
 * Get a specific URL details
 */
router.get('/urls/:id', authenticate, asyncHandler(async (req, res) => {
  const urlId = req.params.id;

  // Only allow owner or admin to view
  if (req.user && req.user.id !== urlId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
    });
  }

  const urlRecord = await URLModel.getByShortCode(urlId);

  if (!urlRecord) {
    return res.status(404).json({
      success: false,
      error: 'URL not found',
    });
  }

  return res.json({
    success: true,
    data: urlRecord,
  });
}));

/**
 * DELETE /api/v1/urls/:id
 * Delete a shortened URL
 */
router.delete('/urls/:id', authenticate, asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  const urlId = req.params.id;
  const result = await URLModel.delete(urlId, req.user.id);

  if (!result) {
    return res.status(404).json({
      success: false,
      error: 'URL not found',
    });
  }

  logger.info('URL deleted', { userId: req.user.id, urlId });

  return res.status(204).send();
}));

/**
 * GET /api/v1/urls
 * List all active URLs for the authenticated user, with total count for pagination
 */
router.get('/urls', authenticate, asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;
  const userId = req.user.id;

  const [urls, total] = await Promise.all([
    URLModel.getByUserId(userId, limit, offset),
    URLModel.getCountByUserId(userId),
  ]);

  return res.json({
    success: true,
    data: urls,
    pagination: {
      limit,
      offset,
      total,
    },
  });
}));

module.exports = router;
