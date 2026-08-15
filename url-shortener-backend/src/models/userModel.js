const db = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');

class UserModel {
  /**
   * Find a user by email
   */
  static async findByEmail(email) {
    try {
      const query = 'SELECT id, email, username, tier, is_active FROM users WHERE email = $1 AND is_active = TRUE;';
      const result = await db.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by email:', { error: error.message, email });
      throw error;
    }
  }

  /**
   * Find a user by ID
   */
  static async findById(id) {
    try {
      const query = 'SELECT id, email, username, tier, is_active FROM users WHERE id = $1 AND is_active = TRUE;';
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID:', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Create a new user with Google Sign-In details
   */
  static async create(email, displayName = null) {
    try {
      const query = `
        INSERT INTO users (id, email, password_hash, username, tier, is_active)
        VALUES (gen_random_uuid(), $1, $2, $3, 'free', TRUE)
        RETURNING id, email, username, tier;
      `;
      
      // Since password_hash is NOT NULL in database schema, generate a secure random password hash
      const passwordHash = crypto.randomBytes(32).toString('hex');
      // Create a default username if not provided (fallback to email prefix)
      const username = displayName || email.split('@')[0];

      const params = [email, passwordHash, username];
      const result = await db.query(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user:', { error: error.message, email });
      throw error;
    }
  }
}

module.exports = UserModel;
