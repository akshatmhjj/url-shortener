const express = require('express');
const router = express.Router();
const URLModel = require('../models/urlModel');
const ClickModel = require('../models/clickModel');
const logger = require('../utils/logger');
const ua = require('ua-parser-js');

/**
 * GET /:shortCode
 * The money endpoint - redirect to original URL
 * CRITICAL: Must be <10ms latency
 */
router.get('/:shortCode', async (req, res) => {
  const startTime = Date.now();

  try {
    const { shortCode } = req.params;

    // Validate short code format (basic check)
    if (!shortCode || shortCode.length < 3 || shortCode.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Invalid short code',
      });
    }

    // Get URL from cache or database
    const urlRecord = await URLModel.getByShortCode(shortCode);

    if (!urlRecord) {
      const latency = Date.now() - startTime;
      logger.debug('Short code not found', { shortCode, latency });
      return res.status(404).json({
        success: false,
        error: 'Short URL not found',
      });
    }

    // Check expiration
    if (urlRecord.expires_at && new Date(urlRecord.expires_at) < new Date()) {
      const latency = Date.now() - startTime;
      logger.warn('URL expired', { shortCode, latency });
      return res.status(410).json({
        success: false,
        error: 'This short URL has expired',
      });
    }

    const latency = Date.now() - startTime;
    logger.debug('Redirect', { shortCode, latency });

    // Queue click event asynchronously (don't wait for it)
    queueClickEvent(urlRecord, req).catch((err) => {
      logger.warn('Failed to queue click event', { error: err.message, shortCode });
    });

    // Perform the redirect immediately
    res.redirect(302, urlRecord.original_url);
  } catch (err) {
    const latency = Date.now() - startTime;
    logger.error('Error in GET /:shortCode:', { error: err.message, latency });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Queue click event for async processing
 * Extracted to separate function to clearly show it doesn't block redirect
 */
async function queueClickEvent(urlRecord, req) {
  try {
    // Extract metadata from request
    const ipAddress = req.ip || req.connection.remoteAddress || null;
    const userAgent = req.get('user-agent') || 'unknown';
    const referrer = req.get('referrer') || null;

    // Parse device type from User-Agent
    const parser = new ua(userAgent);
    const deviceType = parser.getDevice().type || 'desktop';

    // TODO: Implement async queue (RabbitMQ/Kafka)
    // For now, record click directly (in production, should queue)
    await ClickModel.recordClick(urlRecord.id, ipAddress, userAgent, referrer, null, null, deviceType);

    logger.debug('Click event recorded', { urlId: urlRecord.id, deviceType });
  } catch (err) {
    // Don't throw - we don't want to block the redirect
    logger.warn('Error queuing click event:', { error: err.message });
  }
}

module.exports = router;
