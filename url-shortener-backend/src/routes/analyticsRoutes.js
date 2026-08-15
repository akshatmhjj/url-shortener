const express = require('express');
const router = express.Router();
const URLModel = require('../models/urlModel');
const ClickModel = require('../models/clickModel');
const logger = require('../utils/logger');

/**
 * GET /api/v1/analytics/:shortCode
 * Get detailed analytics for a shortened URL
 */
router.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    const { period = '30d' } = req.query;

    // Validate period
    const validPeriods = ['7d', '30d', '90d', '1y', 'all'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Valid values: 7d, 30d, 90d, 1y, all',
      });
    }

    // Get URL record
    const urlRecord = await URLModel.getByShortCode(shortCode);
    if (!urlRecord) {
      return res.status(404).json({
        success: false,
        error: 'Short URL not found',
      });
    }

    // Get analytics
    const analytics = await ClickModel.getAnalytics(urlRecord.id, period);
    const todayClicks = await ClickModel.getTodayClickCount(urlRecord.id);

    logger.info('Analytics retrieved', { shortCode, period });

    return res.json({
      success: true,
      data: {
        url_id: urlRecord.id,
        short_code: urlRecord.short_code,
        short_url: `${process.env.API_URL}/${urlRecord.short_code}`,
        original_url: urlRecord.original_url,
        created_at: urlRecord.created_at,
        period,
        summary: {
          ...analytics.summary,
          clicks_today: todayClicks,
        },
        geographic: {
          countries: analytics.countries.map((c) => ({
            code: c.code,
            clicks: c.clicks,
          })),
        },
        referrers: analytics.referrers,
        devices: analytics.devices,
        time_series: analytics.timeSeries.reverse(), // Sort ascending by date
      },
    });
  } catch (err) {
    logger.error('Error in GET /api/v1/analytics/:shortCode:', { error: err.message });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/analytics/top/urls
 * Get top URLs by click count
 */
router.get('/top/urls', async (req, res) => {
  try {
    const { limit = 10, period = '30d' } = req.query;

    const validPeriods = ['7d', '30d', '90d', '1y', 'all'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period',
      });
    }

    const topUrls = await ClickModel.getTopUrls(Math.min(parseInt(limit), 100), period);

    logger.info('Top URLs retrieved', { limit, period });

    return res.json({
      success: true,
      data: topUrls,
    });
  } catch (err) {
    logger.error('Error in GET /api/v1/analytics/top/urls:', { error: err.message });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

module.exports = router;
