const Supermarket = require('../models/Supermarket');
const { calculateDistance } = require('../utils/distanceCalculator');

// Get all supermarkets
exports.getAllSupermarkets = async (req, res) => {
  try {
    const supermarkets = await Supermarket.find().sort({ createdAt: -1 });
    res.json(supermarkets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get supermarket by ID or code
exports.getSupermarketById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let supermarket = null;
    try {
      // محاولة البحث بالإيدي (MongoDB _id)
      supermarket = await Supermarket.findById(id);
    } catch (e) {
      // إذا فشل، البحث بالكود
      supermarket = await Supermarket.findOne({ code: id.trim().toUpperCase() });
    }
    
    // إذا لم يتم العثور عليه، نبحث مرة أخرى بالكود مباشرة
    if (!supermarket) {
      supermarket = await Supermarket.findOne({ code: id.trim().toUpperCase() });
    }
    
    if (!supermarket) {
      return res.status(404).json({ error: 'Supermarket not found' });
    }
    
    res.json(supermarket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create supermarket
exports.addSupermarket = async (req, res) => {
  try {
    const supermarketData = req.body;
    
    if (!supermarketData.name || !supermarketData.code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }
    
    const supermarket = new Supermarket(supermarketData);
    await supermarket.save();
    res.status(201).json(supermarket);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Supermarket code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Update supermarket
exports.updateSupermarket = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const supermarket = await Supermarket.findByIdAndUpdate(id, updates, { new: true });
    
    if (!supermarket) {
      return res.status(404).json({ error: 'Supermarket not found' });
    }
    
    res.json(supermarket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete supermarket
exports.deleteSupermarket = async (req, res) => {
  try {
    const { id } = req.params;
    const supermarket = await Supermarket.findByIdAndDelete(id);
    
    if (!supermarket) {
      return res.status(404).json({ error: 'Supermarket not found' });
    }
    
    res.json({ message: 'Supermarket deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Find nearest supermarket
exports.findNearestSupermarket = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    const supermarkets = await Supermarket.find({
      $or: [
        { latitude: { $exists: true }, longitude: { $exists: true } },
        { locations: { $exists: true, $ne: [], $size: { $gt: 0 } } }
      ]
    });
    
    if (supermarkets.length === 0) {
      return res.json({ supermarket: null, distance: null, location: null });
    }
    
    // Calculate distances for all supermarkets and their locations
    const supermarketsWithDistance = [];
    
    for (const supermarket of supermarkets) {
      let minDistance = Infinity;
      let nearestLocation = null;
      
      // إذا كان هناك مواقع متعددة، نستخدم الأقرب
      if (supermarket.locations && supermarket.locations.length > 0) {
        for (const location of supermarket.locations) {
          const distance = calculateDistance(
            lat,
            lng,
            location.latitude,
            location.longitude
          );
          if (distance !== null && distance < minDistance) {
            minDistance = distance;
            nearestLocation = location;
          }
        }
      } 
      // استخدام الموقع القديم (latitude, longitude) للتوافق مع الكود القديم
      else if (supermarket.latitude && supermarket.longitude) {
        minDistance = calculateDistance(
          lat,
          lng,
          supermarket.latitude,
          supermarket.longitude
        ) || Infinity;
      }
      
      if (minDistance !== Infinity) {
        supermarketsWithDistance.push({
          supermarket,
          distance: minDistance,
          location: nearestLocation,
        });
      }
    }
    
    if (supermarketsWithDistance.length === 0) {
      return res.json({ supermarket: null, distance: null, location: null });
    }
    
    // Sort by distance
    supermarketsWithDistance.sort((a, b) => a.distance - b.distance);
    
    const nearest = supermarketsWithDistance[0];
    
    res.json({
      supermarket: nearest.supermarket,
      distance: nearest.distance,
      location: nearest.location, // الموقع الأقرب (إذا كان هناك مواقع متعددة)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add location to supermarket
exports.addLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, address } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    const supermarket = await Supermarket.findById(id);
    if (!supermarket) {
      return res.status(404).json({ error: 'Supermarket not found' });
    }
    
    if (!supermarket.locations) {
      supermarket.locations = [];
    }
    
    supermarket.locations.push({
      name: name || null,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: address || null,
      createdAt: new Date(),
    });
    
    await supermarket.save();
    res.json(supermarket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update location in supermarket
exports.updateLocation = async (req, res) => {
  try {
    const { id, locationId } = req.params;
    const { name, latitude, longitude, address } = req.body;
    
    const supermarket = await Supermarket.findById(id);
    if (!supermarket) {
      return res.status(404).json({ error: 'Supermarket not found' });
    }
    
    const location = supermarket.locations.id(locationId);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    if (name !== undefined) location.name = name;
    if (latitude !== undefined) location.latitude = parseFloat(latitude);
    if (longitude !== undefined) location.longitude = parseFloat(longitude);
    if (address !== undefined) location.address = address;
    
    await supermarket.save();
    res.json(supermarket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete location from supermarket
exports.deleteLocation = async (req, res) => {
  try {
    const { id, locationId } = req.params;
    
    const supermarket = await Supermarket.findById(id);
    if (!supermarket) {
      return res.status(404).json({ error: 'Supermarket not found' });
    }
    
    const location = supermarket.locations.id(locationId);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    location.deleteOne();
    await supermarket.save();
    res.json(supermarket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


