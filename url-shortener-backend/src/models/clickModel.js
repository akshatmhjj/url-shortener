const db = require('../config/database');
const logger = require('../utils/logger');

// Validated interval lookup — prevents SQL injection by only allowing known values
const PERIOD_INTERVALS = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  '1y': '1 year',
  'all': '100 years', // Effectively unlimited
};

class ClickModel {
  /**
   * Get a safe SQL interval string from a period key.
   * Throws if the period is not in the whitelist.
   */
  static getSafeInterval(period) {
    const interval = PERIOD_INTERVALS[period];
    if (!interval) {
      throw new Error(`Invalid period: ${period}. Valid values: ${Object.keys(PERIOD_INTERVALS).join(', ')}`);
    }
    return interval;
  }

  /**
   * Record a click asynchronously (queued for background processing)
   */
  static async recordClick(urlId, ipAddress, userAgent, referrer, countryCode = null, city = null, deviceType = 'unknown') {
    try {
      const query = `
        INSERT INTO clicks (url_id, ip_address, user_agent, referrer, country_code, city, device_type, clicked_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id, clicked_at;
      `;

      const params = [urlId, ipAddress, userAgent, referrer, countryCode, city, deviceType];
      const result = await db.query(query, params);

      logger.debug('Click recorded', { urlId, countryCode });
      return result.rows[0];
    } catch (error) {
      logger.error('Error recording click:', { error: error.message, urlId });
      throw error;
    }
  }

  /**
   * Get analytics for a URL
   */
  static async getAnalytics(urlId, period = '30d') {
    try {
      const interval = this.getSafeInterval(period);

      // Get total clicks and unique visitors
      // Using make_interval or casting is safest, but since interval is from our
      // validated whitelist (not user input), this is safe.
      const summaryQuery = `
        SELECT
          COUNT(id) as total_clicks,
          COUNT(DISTINCT ip_address) as unique_visitors,
          MIN(clicked_at) as first_click,
          MAX(clicked_at) as last_click
        FROM clicks
        WHERE url_id = $1
        AND clicked_at > NOW() - $2::interval;
      `;

      const summaryResult = await db.query(summaryQuery, [urlId, interval]);
      const summary = summaryResult.rows[0];

      // Get clicks by country
      const countriesQuery = `
        SELECT
          country_code,
          COUNT(*) as clicks
        FROM clicks
        WHERE url_id = $1
        AND clicked_at > NOW() - $2::interval
        AND country_code IS NOT NULL
        GROUP BY country_code
        ORDER BY clicks DESC
        LIMIT 10;
      `;

      const countriesResult = await db.query(countriesQuery, [urlId, interval]);

      // Get top referrers
      const referrersQuery = `
        SELECT
          referrer,
          COUNT(*) as clicks
        FROM clicks
        WHERE url_id = $1
        AND clicked_at > NOW() - $2::interval
        AND referrer IS NOT NULL
        AND referrer != ''
        GROUP BY referrer
        ORDER BY clicks DESC
        LIMIT 10;
      `;

      const referrersResult = await db.query(referrersQuery, [urlId, interval]);

      // Get device breakdown
      const devicesQuery = `
        SELECT
          device_type,
          COUNT(*) as clicks
        FROM clicks
        WHERE url_id = $1
        AND clicked_at > NOW() - $2::interval
        GROUP BY device_type
        ORDER BY clicks DESC;
      `;

      const devicesResult = await db.query(devicesQuery, [urlId, interval]);

      // Get time series (daily clicks)
      const timeSeriesQuery = `
        SELECT
          DATE(clicked_at) as date,
          COUNT(*) as clicks,
          COUNT(DISTINCT ip_address) as unique_visitors
        FROM clicks
        WHERE url_id = $1
        AND clicked_at > NOW() - $2::interval
        GROUP BY DATE(clicked_at)
        ORDER BY date DESC
        LIMIT 90;
      `;

      const timeSeriesResult = await db.query(timeSeriesQuery, [urlId, interval]);

      return {
        summary: {
          total_clicks: parseInt(summary.total_clicks, 10),
          unique_visitors: parseInt(summary.unique_visitors, 10),
          first_click: summary.first_click,
          last_click: summary.last_click,
        },
        countries: countriesResult.rows.map((row) => ({
          code: row.country_code,
          clicks: parseInt(row.clicks, 10),
        })),
        referrers: referrersResult.rows.map((row) => ({
          referrer: row.referrer,
          clicks: parseInt(row.clicks, 10),
        })),
        devices: devicesResult.rows.map((row) => ({
          type: row.device_type,
          clicks: parseInt(row.clicks, 10),
        })),
        timeSeries: timeSeriesResult.rows.map((row) => ({
          date: row.date,
          clicks: parseInt(row.clicks, 10),
          uniqueVisitors: parseInt(row.unique_visitors, 10),
        })),
      };
    } catch (error) {
      logger.error('Error getting analytics:', { error: error.message, urlId });
      throw error;
    }
  }

  /**
   * Get today's click count for a URL
   */
  static async getTodayClickCount(urlId) {
    try {
      const query = `
        SELECT COUNT(*) as clicks
        FROM clicks
        WHERE url_id = $1
        AND DATE(clicked_at) = CURRENT_DATE;
      `;

      const result = await db.query(query, [urlId]);
      return parseInt(result.rows[0].clicks, 10);
    } catch (error) {
      logger.error('Error getting today click count:', { error: error.message, urlId });
      throw error;
    }
  }

  /**
   * Clean up old click data (for retention policy)
   * Uses parameterized interval to prevent SQL injection.
   */
  static async cleanupOldClicks(retentionDays = 2555) {
    try {
      const query = `
        DELETE FROM clicks
        WHERE clicked_at < NOW() - make_interval(days => $1);
      `;

      const result = await db.query(query, [retentionDays]);
      logger.info('Cleaned up old clicks', { deletedRows: result.rowCount });
      return result.rowCount;
    } catch (error) {
      logger.error('Error cleaning up old clicks:', { error: error.message });
      throw error;
    }
  }

  /**
   * Get top URLs by click count
   */
  static async getTopUrls(limit = 10, period = '30d') {
    try {
      const interval = this.getSafeInterval(period);

      const query = `
        SELECT
          u.id,
          u.short_code,
          u.original_url,
          COUNT(c.id) as clicks
        FROM urls u
        LEFT JOIN clicks c ON u.id = c.url_id
        WHERE c.clicked_at > NOW() - $2::interval
        GROUP BY u.id, u.short_code, u.original_url
        ORDER BY clicks DESC
        LIMIT $1;
      `;

      const result = await db.query(query, [limit, interval]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting top URLs:', { error: error.message });
      throw error;
    }
  }
}

module.exports = ClickModel;
