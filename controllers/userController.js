const User = require('../models/User');
const { normalizeIraqiPhone } = require('../utils/phoneUtils');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// Helper function to find user by phone (supports both old and new formats)
// Exported for use in other controllers
exports.findUserByPhone = async function(phone) {
  const normalizedPhone = normalizeIraqiPhone(phone);
  
  // البحث عن المستخدم بالشكل الجديد (مع +964)
  let user = await User.findOne({ phone: normalizedPhone });
  
  // إذا لم يتم العثور عليه، جرب البحث بالشكل القديم (بدون +964)
  if (!user) {
    // تحويل +9647890009999 إلى 07890009999
    let oldFormat = normalizedPhone;
    if (oldFormat.startsWith('+964')) {
      oldFormat = '0' + oldFormat.substring(4);
    }
    user = await User.findOne({ phone: oldFormat });
    
    // إذا تم العثور عليه بالشكل القديم، قم بتحديثه إلى الشكل الجديد
    if (user && !user.phone.startsWith('+964')) {
      user.phone = normalizedPhone;
      await user.save();
    }
  }
  
  return user;
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user by phone
exports.getUserByPhone = async (req, res) => {
  try {
    const user = await exports.findUserByPhone(req.params.phone);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't send password in response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Authenticate user (login)
exports.authenticateUser = async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }
    
    const user = await exports.findUserByPhone(phone);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }
    
    // Don't send password in response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create user
exports.addUser = async (req, res) => {
  try {
    const { name, phone, password, address } = req.body;
    
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone and password are required' });
    }
    
    const normalizedPhone = normalizeIraqiPhone(phone);
    
    // Check if user exists
    const existingUser = await User.findOne({ phone: normalizedPhone });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      name,
      phone: normalizedPhone,
      password: hashedPassword,
      address,
    });
    
    await user.save();
    
    // Don't send password in response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Phone number already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (updates.phone) {
      updates.phone = normalizeIraqiPhone(updates.phone);
    }
    
    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update user FCM token by phone
exports.updateFcmTokenByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    const { fcmToken } = req.body;
    
    logger.debug(`📱 Received FCM token update request for phone: ${phone}`);
    logger.debug(`   FCM token: ${fcmToken ? fcmToken.substring(0, 20) + '...' : 'MISSING'}`);
    
    if (!fcmToken) {
      logger.warn(`❌ FCM token is missing in request body for phone: ${phone}`);
      return res.status(400).json({ error: 'FCM token is required' });
    }
    
    // Use findUserByPhone helper which handles both old and new phone formats
    logger.debug(`🔍 Searching for user with phone: ${phone}`);
    const user = await exports.findUserByPhone(phone);
    
    if (!user) {
      logger.warn(`❌ User not found for phone: ${phone} when updating FCM token`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    logger.debug(`✅ User found: ${user.name} (${user.phone})`);
    
    // Normalize fcmToken to array (handle old string values for backwards compatibility)
    let tokens = Array.isArray(user.fcmToken) ? user.fcmToken : (user.fcmToken ? [user.fcmToken] : []);
    
    // Add new token if it doesn't exist (support multiple devices)
    const oldTokensCount = tokens.length;
    if (!tokens.includes(fcmToken)) {
      tokens.push(fcmToken);
      logger.success(`✅ Added FCM token for user ${user.name} (${user.phone}) - now has ${tokens.length} device(s)`);
      logger.debug(`   New token: ${fcmToken.substring(0, 20)}...`);
    } else {
      logger.debug(`FCM token already exists for user ${user.name} (${user.phone})`);
    }
    
    user.fcmToken = tokens;
    user.updatedAt = new Date();
    await user.save();
    
    res.json({ message: 'FCM token updated successfully', user });
  } catch (error) {
    logger.error('Error updating user FCM token:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update user FCM token by ID
exports.updateFcmToken = async (req, res) => {
  try {
    const { id } = req.params;
    const { fcmToken } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({ error: 'FCM token is required' });
    }
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Normalize fcmToken to array (handle old string values for backwards compatibility)
    let tokens = Array.isArray(user.fcmToken) ? user.fcmToken : (user.fcmToken ? [user.fcmToken] : []);
    
    // Add new token if it doesn't exist (support multiple devices)
    if (!tokens.includes(fcmToken)) {
      tokens.push(fcmToken);
      logger.success(`✅ Added FCM token for user ${user.name} (${user.phone}) - now has ${tokens.length} device(s)`);
    }
    
    user.fcmToken = tokens;
    user.updatedAt = new Date();
    await user.save();
    
    res.json({ message: 'FCM token updated successfully', user });
  } catch (error) {
    logger.error('Error updating user FCM token:', error);
    res.status(500).json({ error: error.message });
  }
};

// Check FCM token status for a user by phone
exports.checkFcmTokenStatus = async (req, res) => {
  try {
    const { phone } = req.params;
    logger.debug(`🔍 Checking FCM token status for phone: ${phone}`);
    
    const user = await exports.findUserByPhone(phone);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Normalize fcmToken to array (handle old string values for backwards compatibility)
    const tokens = Array.isArray(user.fcmToken) ? user.fcmToken : (user.fcmToken ? [user.fcmToken] : []);
    const validTokens = tokens.filter(token => token && token.trim().length > 0);
    const hasToken = validTokens.length > 0;
    
    logger.debug(`📱 FCM token status for ${user.name} (${user.phone}): ${hasToken ? `EXISTS (${validTokens.length} device(s))` : 'MISSING'}`);
    
    res.json({
      phone: user.phone,
      name: user.name,
      hasFcmToken: hasToken,
      deviceCount: validTokens.length,
      fcmTokenPreview: validTokens.length > 0 ? validTokens[0].substring(0, 20) + '...' : null,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    logger.error('Error checking FCM token status:', error);
    res.status(500).json({ error: error.message });
  }
};




