const Advertisement = require('../models/Advertisement');

// Get all advertisements
exports.getAllAdvertisements = async (req, res) => {
  try {
    const { serviceType, isActive } = req.query;
    const query = {};
    
    if (serviceType) query.serviceType = serviceType;
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Filter expired advertisements
    const now = new Date();
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: now } },
    ];
    
    const advertisements = await Advertisement.find(query).sort({ createdAt: -1 });
    res.json(advertisements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get advertisement by ID
exports.getAdvertisementById = async (req, res) => {
  try {
    const advertisement = await Advertisement.findById(req.params.id);
    
    if (!advertisement) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }
    
    res.json(advertisement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create advertisement
exports.createAdvertisement = async (req, res) => {
  try {
    const advertisementData = req.body;
    
    if (!advertisementData.title || !advertisementData.serviceType) {
      return res.status(400).json({ error: 'Title and serviceType are required' });
    }
    
    const advertisement = new Advertisement(advertisementData);
    await advertisement.save();
    res.status(201).json(advertisement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update advertisement
exports.updateAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const advertisement = await Advertisement.findByIdAndUpdate(id, updates, { new: true });
    
    if (!advertisement) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }
    
    res.json(advertisement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete advertisement
exports.deleteAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;
    const advertisement = await Advertisement.findByIdAndDelete(id);
    
    if (!advertisement) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }
    
    res.json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};







