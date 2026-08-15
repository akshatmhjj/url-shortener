const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Use a non-blocking write stream instead of appendFileSync
const errorLogStream = fs.createWriteStream(path.join(logDir, 'error.log'), { flags: 'a' });

errorLogStream.on('error', (err) => {
  console.error('Failed to write to error log file:', err.message);
});

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLogLevel = logLevels[process.env.LOG_LEVEL || 'info'];

const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };

  if (process.env.LOG_FORMAT === 'json') {
    return JSON.stringify(logEntry);
  }

  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
};

const log = (level, message, meta = {}) => {
  if (logLevels[level] <= currentLogLevel) {
    const formatted = formatLog(level, message, meta);
    console.log(formatted);

    // Write to file asynchronously (non-blocking)
    if (level === 'error') {
      errorLogStream.write(formatted + '\n');
    }
  }
};

module.exports = {
  error: (message, meta = {}) => log('error', message, meta),
  warn: (message, meta = {}) => log('warn', message, meta),
  info: (message, meta = {}) => log('info', message, meta),
  debug: (message, meta = {}) => log('debug', message, meta),
};
