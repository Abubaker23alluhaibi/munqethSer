const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

// Cloudinary configuration with default values
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dkq0wxrzc',
  api_key: process.env.CLOUDINARY_API_KEY || '149161145116759',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'zWhVYUaThJ2jUe5vIL2RFzgYVSY',
});

logger.success('Cloudinary configured');

module.exports = cloudinary;

