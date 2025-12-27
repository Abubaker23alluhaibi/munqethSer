const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const logger = require('../utils/logger');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Upload single image
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'munqeth',
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    res.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
    });
  } catch (error) {
    logger.error('Error uploading image:', error);
    res.status(500).json({ error: error.message });
  }
};

// Upload multiple images
exports.uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'munqeth',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);

    res.json({
      images: results.map((result) => ({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      })),
    });
  } catch (error) {
    logger.error('Error uploading images:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete image
exports.deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    const result = await cloudinary.uploader.destroy(publicId);
    res.json(result);
  } catch (error) {
    logger.error('Error deleting image:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get optimized image URL
exports.getImageUrl = (req, res) => {
  try {
    const { url, width, height, quality } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // If it's a Cloudinary URL, we can optimize it
    if (url.includes('cloudinary.com')) {
      const publicId = url.split('/').pop().split('.')[0];
      const transformations = [];

      if (width) transformations.push(`w_${width}`);
      if (height) transformations.push(`h_${height}`);
      if (quality) transformations.push(`q_${quality}`);
      else transformations.push('q_auto');

      const optimizedUrl = cloudinary.url(publicId, {
        transformation: transformations.join(','),
      });

      return res.json({ url: optimizedUrl });
    }

    // Return original URL if not Cloudinary
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Export multer middleware
exports.upload = upload;







