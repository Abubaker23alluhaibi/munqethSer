const { calculateDistance } = require('../utils/distanceCalculator');
const Driver = require('../models/Driver');
const User = require('../models/User');

// Update location
exports.updateLocation = async (req, res) => {
  try {
    const { userId, driverId, latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    if (driverId) {
      const driver = await Driver.findByIdAndUpdate(
        driverId,
        {
          currentLatitude: parseFloat(latitude),
          currentLongitude: parseFloat(longitude),
          lastLocationUpdate: new Date(),
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`driver:${driverId}`).emit('driver:location:updated', {
          driverId,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          timestamp: new Date(),
        });
      }

      return res.json(driver);
    }

    // For users, we might want to store location temporarily
    // This is a simple implementation
    res.json({
      message: 'Location updated',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get current location
exports.getCurrentLocation = async (req, res) => {
  try {
    const { userId, driverId } = req.query;

    if (driverId) {
      const driver = await Driver.findById(driverId);
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      return res.json({
        latitude: driver.currentLatitude,
        longitude: driver.currentLongitude,
        lastUpdate: driver.lastLocationUpdate,
      });
    }

    res.status(400).json({ error: 'userId or driverId is required' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Calculate distance
exports.calculateDistance = async (req, res) => {
  try {
    const { lat1, lon1, lat2, lon2 } = req.query;

    if (!lat1 || !lon1 || !lat2 || !lon2) {
      return res.status(400).json({ error: 'All coordinates are required' });
    }

    const distance = calculateDistance(
      parseFloat(lat1),
      parseFloat(lon1),
      parseFloat(lat2),
      parseFloat(lon2)
    );

    res.json({ distance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};







