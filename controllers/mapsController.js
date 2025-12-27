const googleMaps = require('../config/googleMaps');
const logger = require('../utils/logger');

/**
 * Get directions between two points
 */
exports.getDirections = async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng, mode } = req.query;

    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({ error: 'Origin and destination coordinates are required' });
    }

    if (!googleMaps.isConfigured()) {
      return res.status(503).json({ 
        error: 'Google Maps API is not configured',
        message: 'Please add GOOGLE_MAPS_API_KEY to environment variables'
      });
    }

    const directions = await googleMaps.getDirections(
      parseFloat(originLat),
      parseFloat(originLng),
      parseFloat(destLat),
      parseFloat(destLng),
      mode || 'driving'
    );

    res.json(directions);
  } catch (error) {
    logger.error('Error in getDirections:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Geocode an address to coordinates
 */
exports.geocodeAddress = async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    if (!googleMaps.isConfigured()) {
      return res.status(503).json({ 
        error: 'Google Maps API is not configured',
        message: 'Please add GOOGLE_MAPS_API_KEY to environment variables'
      });
    }

    const geocode = await googleMaps.geocodeAddress(address);
    res.json(geocode);
  } catch (error) {
    logger.error('Error in geocodeAddress:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Reverse geocode coordinates to address
 */
exports.reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    if (!googleMaps.isConfigured()) {
      return res.status(503).json({ 
        error: 'Google Maps API is not configured',
        message: 'Please add GOOGLE_MAPS_API_KEY to environment variables'
      });
    }

    const geocode = await googleMaps.reverseGeocode(parseFloat(lat), parseFloat(lng));
    res.json(geocode);
  } catch (error) {
    logger.error('Error in reverseGeocode:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Check Google Maps API status
 */
exports.getStatus = async (req, res) => {
  res.json({
    configured: googleMaps.isConfigured(),
    message: googleMaps.isConfigured() 
      ? 'Google Maps API is configured' 
      : 'Google Maps API is not configured. Add GOOGLE_MAPS_API_KEY to environment variables.'
  });
};






