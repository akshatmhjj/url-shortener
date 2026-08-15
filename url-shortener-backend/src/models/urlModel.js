const db = require('../config/database');
const cache = require('../config/redis');
const { encodeCounter } = require('../utils/encoding');
const logger = require('../utils/logger');

class URLModel {
  /**
   * Get next short code counter from database
   */
  static async getNextCounter() {
    try {
      const result = await db.query('SELECT get_next_short_code_counter() as counter;');
      return result.rows[0].counter;
    } catch (error) {
      logger.error('Error getting counter:', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a new shortened URL
   */
  static async create(userId, originalUrl, shortCode, customAlias = null, title = null, ttl = null) {
    try {
      const query = `
        INSERT INTO urls (id, user_id, original_url, short_code, custom_alias, title, expires_at, is_active)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, TRUE)
        RETURNING id, short_code, original_url, created_at, expires_at;
      `;

      const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : null;
      const params = [userId, originalUrl, shortCode, customAlias, title, expiresAt];

      const result = await db.query(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating URL:', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get URL by short code
   */
  static async getByShortCode(shortCode) {
    try {
      // Check cache first
      const cached = await cache.get(`url:${shortCode}`);
      if (cached) {
        logger.debug('Cache hit for short code', { shortCode });
        return JSON.parse(cached);
      }

      // Query database
      const query = `
        SELECT id, short_code, original_url, user_id, created_at, expires_at, is_active
        FROM urls
        WHERE short_code = $1 AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW());
      `;

      const result = await db.query(query, [shortCode]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const url = result.rows[0];

      // Cache for future requests (24 hour TTL)
      await cache.set(`url:${shortCode}`, JSON.stringify(url), 86400).catch((err) => {
        logger.warn('Cache set failed', { error: err.message, shortCode });
      });

      logger.debug('Retrieved URL from database', { shortCode });
      return url;
    } catch (error) {
      logger.error('Error getting URL by short code:', { error: error.message, shortCode });
      throw error;
    }
  }

  /**
   * Get URL by custom alias
   */
  static async getByCustomAlias(customAlias) {
    try {
      const query = `
        SELECT id, short_code, original_url, user_id, created_at, expires_at, is_active
        FROM urls
        WHERE custom_alias = $1 AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW());
      `;

      const result = await db.query(query, [customAlias]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error getting URL by custom alias:', { error: error.message, customAlias });
      throw error;
    }
  }

  /**
   * Get all URLs for a user
   */
  static async getByUserId(userId, limit = 50, offset = 0) {
    try {
      const query = `
        SELECT id, short_code, original_url, custom_alias, title, created_at, expires_at, is_active
        FROM urls
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3;
      `;

      const result = await db.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting URLs by user ID:', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get URL count for a user
   */
  static async getCountByUserId(userId) {
    try {
      const query = 'SELECT COUNT(*) FROM urls WHERE user_id = $1 AND is_active = TRUE;';
      const result = await db.query(query, [userId]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Error getting URL count:', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get all active URLs
   */
  static async getAll(limit = 50, offset = 0) {
    try {
      const query = `
        SELECT id, short_code, original_url, custom_alias, title, created_at, expires_at, is_active
        FROM urls
        WHERE is_active = TRUE
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;
      `;
      const result = await db.query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all active URLs:', { error: error.message });
      throw error;
    }
  }

  /**
   * Get count of all active URLs
   */
  static async getAllCount() {
    try {
      const query = 'SELECT COUNT(*) FROM urls WHERE is_active = TRUE;';
      const result = await db.query(query);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Error getting all URLs count:', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if short code exists
   */
  static async shortCodeExists(shortCode) {
    try {
      const result = await db.query('SELECT 1 FROM urls WHERE short_code = $1 LIMIT 1;', [shortCode]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking short code existence:', { error: error.message, shortCode });
      throw error;
    }
  }

  /**
   * Check if custom alias exists
   */
  static async customAliasExists(customAlias) {
    try {
      const result = await db.query('SELECT 1 FROM urls WHERE custom_alias = $1 LIMIT 1;', [customAlias]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking custom alias existence:', { error: error.message, customAlias });
      throw error;
    }
  }

  /**
   * Delete a URL (soft delete)
   */
  static async delete(urlId, userId) {
    try {
      const query = `
        UPDATE urls
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING id, short_code;
      `;

      const result = await db.query(query, [urlId, userId]);
      
      if (result.rows.length > 0) {
        // Invalidate cache
        const shortCode = result.rows[0].short_code;
        await cache.del(`url:${shortCode}`).catch((err) => {
          logger.warn('Cache delete failed', { error: err.message, shortCode });
        });
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting URL:', { error: error.message, urlId, userId });
      throw error;
    }
  }

  /**
   * Update URL metadata
   */
  static async update(urlId, userId, updates) {
    try {
      const allowedUpdates = ['title', 'metadata'];
      const updateFields = [];
      const values = [urlId, userId];
      let paramIndex = 3;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        return null;
      }

      values.push(new Date());
      const query = `
        UPDATE urls
        SET ${updateFields.join(', ')}, updated_at = $${paramIndex}
        WHERE id = $1 AND user_id = $2
        RETURNING id, short_code, original_url, title;
      `;

      const result = await db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating URL:', { error: error.message, urlId, userId });
      throw error;
    }
  }

  /**
   * Get URL with analytics
   */
  static async getWithAnalytics(shortCode) {
    try {
      const query = `
        SELECT
          u.id,
          u.short_code,
          u.original_url,
          u.created_at,
          COUNT(c.id) as total_clicks,
          COUNT(DISTINCT c.ip_address) as unique_visitors,
          MAX(c.clicked_at) as last_clicked
        FROM urls u
        LEFT JOIN clicks c ON u.id = c.url_id
        WHERE u.short_code = $1 AND u.is_active = TRUE
        GROUP BY u.id, u.short_code, u.original_url, u.created_at;
      `;

      const result = await db.query(query, [shortCode]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting URL with analytics:', { error: error.message, shortCode });
      throw error;
    }
  }

  /**
   * Batch create URLs
   */
  static async createBatch(userId, urls) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const results = [];
      for (const urlData of urls) {
        const counter = await this.getNextCounter();
        const shortCode = encodeCounter(counter);

        const result = await client.query(
          `INSERT INTO urls (id, user_id, original_url, short_code, title, is_active)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, TRUE)
           RETURNING id, short_code, original_url;`,
          [userId, urlData.url, shortCode, urlData.title || null]
        );

        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      logger.info('Batch URLs created', { userId, count: urls.length });
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating batch URLs:', { error: error.message, userId });
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = URLModel;
