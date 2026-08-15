require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const logger = require('../utils/logger');

const initDb = async () => {
  try {
    logger.info('Starting database initialization...');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/001_init.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration SQL
    await db.query(migrationSql);

    logger.info('✓ Database initialized successfully');
    process.exit(0);
  } catch (err) {
    logger.error('Database initialization failed:', { error: err.message });
    process.exit(1);
  }
};

initDb();
