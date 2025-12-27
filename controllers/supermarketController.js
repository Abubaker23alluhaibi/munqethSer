const Supermarket = require('../models/Supermarket');
const { calculateDistance } = require('../utils/distanceCalculator');
const logger = require('../utils/logger');

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
    
    // التحقق من صحة الإحداثيات
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude values' });
    }
    
    const supermarkets = await Supermarket.find({
      $or: [
        { latitude: { $exists: true }, longitude: { $exists: true } },
        { 'locations.0': { $exists: true } } // التحقق من وجود موقع واحد على الأقل
      ]
    }).lean(); // استخدام lean() للحصول على plain objects بدلاً من Mongoose documents
    
    if (supermarkets.length === 0) {
      return res.json({ supermarket: null, distance: null, location: null });
    }
    
    // Calculate distances for all supermarkets and their locations
    const supermarketsWithDistance = [];
    
    for (const supermarket of supermarkets) {
      let minDistance = Infinity;
      let nearestLocation = null;
      
      logger.debug(`🔍 Processing supermarket: ${supermarket.name}, locations count: ${supermarket.locations?.length || 0}`);
      
      // إذا كان هناك مواقع متعددة، نستخدم الأقرب
      if (supermarket.locations && supermarket.locations.length > 0) {
        for (let i = 0; i < supermarket.locations.length; i++) {
          const location = supermarket.locations[i];
          logger.debug(`📍 Location ${i}:`, {
            name: location.name,
            latitude: location.latitude,
            longitude: location.longitude,
            latType: typeof location.latitude,
            lngType: typeof location.longitude
          });
          
          // التحقق من وجود latitude و longitude في الموقع وتحويلها إلى أرقام
          const locLat = location.latitude != null ? parseFloat(location.latitude) : null;
          const locLng = location.longitude != null ? parseFloat(location.longitude) : null;
          
          logger.debug(`   Parsed: lat=${locLat}, lng=${locLng}, isNaN: ${isNaN(locLat) || isNaN(locLng)}`);
          
          if (locLat != null && locLng != null && 
              !isNaN(locLat) && !isNaN(locLng) &&
              isFinite(locLat) && isFinite(locLng)) {
            const distance = calculateDistance(
              lat,
              lng,
              locLat,
              locLng
            );
            logger.debug(`   Distance calculated: ${distance} km`);
            
            // التحقق من أن المسافة صحيحة وليست NaN
            if (distance != null && !isNaN(distance) && isFinite(distance) && distance < minDistance) {
              minDistance = distance;
              nearestLocation = location;
              logger.debug(`   ✅ New nearest location found: ${location.name || 'unnamed'}, distance: ${distance} km`);
            }
          } else {
            logger.debug(`   ❌ Invalid location coordinates`);
          }
        }
      } 
      // استخدام الموقع القديم (latitude, longitude) للتوافق مع الكود القديم
      else if (supermarket.latitude != null && supermarket.longitude != null) {
        const supLat = parseFloat(supermarket.latitude);
        const supLng = parseFloat(supermarket.longitude);
        
        if (!isNaN(supLat) && !isNaN(supLng) && isFinite(supLat) && isFinite(supLng)) {
          const distance = calculateDistance(
            lat,
            lng,
            supLat,
            supLng
          );
          // التحقق من أن المسافة صحيحة
          if (distance != null && !isNaN(distance) && isFinite(distance)) {
            minDistance = distance;
          }
        }
      }
      
      // إضافة السوبر ماركت فقط إذا كانت المسافة صحيحة
      if (minDistance !== Infinity && !isNaN(minDistance) && isFinite(minDistance)) {
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
    supermarketsWithDistance.sort((a, b) => {
      // التحقق من أن المسافات صحيحة قبل المقارنة
      const distA = isNaN(a.distance) || !isFinite(a.distance) ? Infinity : a.distance;
      const distB = isNaN(b.distance) || !isFinite(b.distance) ? Infinity : b.distance;
      return distA - distB;
    });
    
    const nearest = supermarketsWithDistance[0];
    
    // التحقق من أن النتيجة صحيحة
    if (!nearest || isNaN(nearest.distance) || !isFinite(nearest.distance)) {
      return res.json({ supermarket: null, distance: null, location: null });
    }
    
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
    
    const locLat = parseFloat(latitude);
    const locLng = parseFloat(longitude);
    
    // التحقق من صحة الإحداثيات
    if (isNaN(locLat) || isNaN(locLng) || !isFinite(locLat) || !isFinite(locLng)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude values' });
    }
    
    supermarket.locations.push({
      name: name || null,
      latitude: locLat,
      longitude: locLng,
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
    if (latitude !== undefined) {
      const locLat = parseFloat(latitude);
      if (isNaN(locLat) || !isFinite(locLat)) {
        return res.status(400).json({ error: 'Invalid latitude value' });
      }
      location.latitude = locLat;
    }
    if (longitude !== undefined) {
      const locLng = parseFloat(longitude);
      if (isNaN(locLng) || !isFinite(locLng)) {
        return res.status(400).json({ error: 'Invalid longitude value' });
      }
      location.longitude = locLng;
    }
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


