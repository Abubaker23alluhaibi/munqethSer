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
      latitude: { $exists: true },
      longitude: { $exists: true },
    });
    
    if (supermarkets.length === 0) {
      return res.json({ supermarket: null, distance: null });
    }
    
    // Calculate distances
    const supermarketsWithDistance = supermarkets.map(supermarket => {
      const distance = calculateDistance(
        lat,
        lng,
        supermarket.latitude,
        supermarket.longitude
      );
      return {
        supermarket,
        distance,
      };
    });
    
    // Sort by distance
    supermarketsWithDistance.sort((a, b) => a.distance - b.distance);
    
    const nearest = supermarketsWithDistance[0];
    
    res.json({
      supermarket: nearest.supermarket,
      distance: nearest.distance,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


