const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = ALPHABET.length; // 62

/**
 * Encode a number to Base62 string
 * @param {number} num - Number to encode
 * @returns {string} Base62 encoded string
 */
function encode(num) {
  if (num === 0) return ALPHABET[0];

  let encoded = '';
  while (num > 0) {
    encoded = ALPHABET[num % BASE] + encoded;
    num = Math.floor(num / BASE);
  }
  return encoded;
}

/**
 * Decode a Base62 string to number
 * @param {string} str - Base62 string to decode
 * @returns {number} Decoded number
 */
function decode(str) {
  let decoded = 0;
  for (let i = 0; i < str.length; i++) {
    decoded = decoded * BASE + ALPHABET.indexOf(str[i]);
  }
  return decoded;
}

/**
 * Generate a random short code (6-7 characters)
 * @returns {string} Random Base62 short code
 */
function generateRandomShortCode() {
  // Generate random number between 1 billion and 62^7 (3.6 trillion)
  const min = 1000000000; // 1 billion (ensures 7+ digit code)
  const max = Math.pow(BASE, 7) - 1; // 62^7 - 1
  const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
  return encode(randomNum);
}

/**
 * Generate short code from counter (deterministic, collision-free)
 * @param {number} counter - Counter value
 * @returns {string} Base62 encoded short code
 */
function encodeCounter(counter) {
  return encode(counter + 1000000); // Offset to ensure variability
}

module.exports = {
  encode,
  decode,
  generateRandomShortCode,
  encodeCounter,
  ALPHABET,
  BASE,
};
