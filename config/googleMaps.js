const axios = require('axios');

// Google Maps API configuration
// يمكنك إضافة API Key هنا مباشرة أو استخدام Environment Variable
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBmY1uIqjlHA3UPRyhzxYqOCr6264nFzjo';

// Base URLs
const DIRECTIONS_API_URL = 'https://maps.googleapis.com/maps/api/directions/json';
const GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

/**
 * Get directions between two points
 * @param {number} originLat - Origin latitude
 * @param {number} originLng - Origin longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLng - Destination longitude
 * @param {string} mode - Travel mode (driving, walking, bicycling, transit)
 * @returns {Promise<object>} Directions response
 */
async function getDirections(originLat, originLng, destLat, destLng, mode = 'driving') {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API Key is not configured. Please add GOOGLE_MAPS_API_KEY to environment variables.');
  }

  try {
    const response = await axios.get(DIRECTIONS_API_URL, {
      params: {
        origin: `${originLat},${originLng}`,
        destination: `${destLat},${destLng}`,
        mode: mode,
        key: GOOGLE_MAPS_API_KEY,
        language: 'ar', // Arabic
        region: 'IQ', // Iraq
      },
    });

    if (response.data.status === 'OK') {
      return response.data;
    } else {
      throw new Error(`Directions API error: ${response.data.status}`);
    }
  } catch (error) {
    console.error('Error getting directions:', error);
    throw error;
  }
}

/**
 * Geocode an address to coordinates
 * @param {string} address - Address to geocode
 * @returns {Promise<object>} Geocoding response
 */
async function geocodeAddress(address) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API Key is not configured. Please add GOOGLE_MAPS_API_KEY to environment variables.');
  }

  try {
    const response = await axios.get(GEOCODING_API_URL, {
      params: {
        address: address,
        key: GOOGLE_MAPS_API_KEY,
        language: 'ar',
        region: 'IQ',
      },
    });

    if (response.data.status === 'OK') {
      return response.data;
    } else {
      throw new Error(`Geocoding API error: ${response.data.status}`);
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    throw error;
  }
}

/**
 * Reverse geocode coordinates to address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<object>} Reverse geocoding response
 */
async function reverseGeocode(lat, lng) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API Key is not configured. Please add GOOGLE_MAPS_API_KEY to environment variables.');
  }

  try {
    const response = await axios.get(GEOCODING_API_URL, {
      params: {
        latlng: `${lat},${lng}`,
        key: GOOGLE_MAPS_API_KEY,
        language: 'ar',
        region: 'IQ',
      },
    });

    if (response.data.status === 'OK') {
      return response.data;
    } else {
      throw new Error(`Reverse geocoding API error: ${response.data.status}`);
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    throw error;
  }
}

/**
 * Check if Google Maps API is configured
 * @returns {boolean}
 */
function isConfigured() {
  return !!GOOGLE_MAPS_API_KEY;
}

// Log configuration status on load
if (isConfigured()) {
  console.log('✅ Google Maps API configured');
} else {
  console.log('ℹ️ Google Maps API not configured (optional - add GOOGLE_MAPS_API_KEY to use directions/geocoding)');
}

module.exports = {
  getDirections,
  geocodeAddress,
  reverseGeocode,
  isConfigured,
  GOOGLE_MAPS_API_KEY,
};
