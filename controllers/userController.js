const User = require('../models/User');
const { normalizeIraqiPhone } = require('../utils/phoneUtils');
const bcrypt = require('bcryptjs');

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
    
    if (!fcmToken) {
      return res.status(400).json({ error: 'FCM token is required' });
    }
    
    const normalizedPhone = normalizeIraqiPhone(phone);
    const user = await User.findOneAndUpdate(
      { phone: normalizedPhone },
      { fcmToken, updatedAt: new Date() },
      { new: true, upsert: false } // Don't create if doesn't exist
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`✅ Updated FCM token for user ${user.name} (${user.phone})`);
    res.json({ message: 'FCM token updated successfully', user });
  } catch (error) {
    console.error('Error updating user FCM token:', error);
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
    
    const user = await User.findByIdAndUpdate(
      id,
      { fcmToken, updatedAt: new Date() },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`✅ Updated FCM token for user ${user.name} (${user.phone})`);
    res.json({ message: 'FCM token updated successfully', user });
  } catch (error) {
    console.error('Error updating user FCM token:', error);
    res.status(500).json({ error: error.message });
  }
};




