const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware');

router.post('/google', asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      error: 'Missing idToken in request body',
    });
  }

  let email;
  let name;

  // Check for mock token (developer simulation)
  if (idToken.startsWith('mock_token_')) {
    email = idToken.substring('mock_token_'.length);
    name = email.split('@')[0];
    logger.info('Simulated Google Sign-In used', { email });
  } else {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    if (!clientID) {
      return res.status(500).json({
        success: false,
        error: 'Google Sign-In is not configured on the backend. Provide GOOGLE_CLIENT_ID in .env, or use mock sign-in for development.',
      });
    }

    try {
      const googleResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      const tokenInfo = googleResponse.data;

      if (tokenInfo.aud !== clientID) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token audience (Google Client ID mismatch)',
        });
      }

      email = tokenInfo.email;
      name = tokenInfo.name || tokenInfo.given_name;
    } catch (error) {
      logger.error('Google token verification failed:', { error: error.message });
      return res.status(401).json({
        success: false,
        error: 'Invalid Google token',
      });
    }
  }

  // Find or create user
  let user = await UserModel.findByEmail(email);
  if (!user) {
    user = await UserModel.create(email, name);
    logger.info('New user registered via Google Sign-In', { email, userId: user.id });
  } else {
    logger.info('User logged in via Google Sign-In', { email, userId: user.id });
  }

  // Generate JWT
  const payload = {
    id: user.id,
    sub: user.id,
    email: user.email,
    role: 'user',
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '1h',
  });

  return res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        tier: user.tier,
      },
    },
  });
}));

module.exports = router;
