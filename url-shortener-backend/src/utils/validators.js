const Joi = require('joi');

// Custom error messages
const messages = {
  'string.uri': 'Must be a valid URL',
  'string.max': 'URL must be less than {#limit} characters',
  'string.min': 'URL must be at least {#limit} characters',
  'any.required': 'This field is required',
};

// URL validation schema
const urlSchema = Joi.object({
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(parseInt(process.env.MAX_URL_LENGTH) || 2048)
    .required()
    .messages(messages),
  custom_alias: Joi.string()
    .alphanum()
    .min(parseInt(process.env.MIN_CUSTOM_ALIAS_LENGTH) || 3)
    .max(parseInt(process.env.MAX_CUSTOM_ALIAS_LENGTH) || 50)
    .optional()
    .messages(messages),
  title: Joi.string().max(255).optional(),
  ttl: Joi.number().min(3600).optional(), // Minimum 1 hour
  tags: Joi.array().items(Joi.string().max(50)).optional(),
});

// Batch shorten validation schema
const batchShortenSchema = Joi.object({
  urls: Joi.array()
    .items(
      Joi.object({
        url: Joi.string()
          .uri({ scheme: ['http', 'https'] })
          .max(parseInt(process.env.MAX_URL_LENGTH) || 2048)
          .required(),
        title: Joi.string().max(255).optional(),
      })
    )
    .min(1)
    .max(1000)
    .required(),
});

/**
 * Validate shorten request
 * @param {object} data - Request data
 * @returns {object} Validation result
 */
function validateShortenRequest(data) {
  return urlSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
}

/**
 * Validate batch shorten request
 * @param {object} data - Request data
 * @returns {object} Validation result
 */
function validateBatchShortenRequest(data) {
  return batchShortenSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
}

/**
 * Check if URL is in blacklist (phishing, malware, etc.)
 * @param {string} url - URL to check
 * @returns {boolean} True if blacklisted
 */
function isUrlBlacklisted(url) {
  // List of known malicious domains
  const blacklist = [
    'malicious.com',
    'phishing.com',
    'malware.example.com',
  ];

  try {
    const urlObj = new URL(url);
    return blacklist.some((domain) => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Sanitize URL (trim, normalize)
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL
 */
function sanitizeUrl(url) {
  return url.trim();
}

/**
 * Validate custom alias format
 * @param {string} alias - Alias to validate
 * @returns {boolean} True if valid
 */
function isValidAlias(alias) {
  return /^[a-z0-9-]{3,50}$/i.test(alias);
}

module.exports = {
  validateShortenRequest,
  validateBatchShortenRequest,
  isUrlBlacklisted,
  sanitizeUrl,
  isValidAlias,
};
