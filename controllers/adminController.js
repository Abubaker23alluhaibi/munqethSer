const Admin = require('../models/Admin');

// Get all admins
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get admin by ID
exports.getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    res.json(admin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get admin by code
exports.getAdminByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const admin = await Admin.findOne({ code: code.trim() });
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    res.json(admin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login admin (check if code matches)
exports.loginAdmin = async (req, res) => {
  try {
    const { id, code } = req.body;
    
    if (!id || !code) {
      return res.status(400).json({ error: 'ID and code are required' });
    }
    
    // تحويل ID والكود إلى uppercase للبحث
    const cleanId = id.trim().toUpperCase();
    const cleanCode = code.trim();
    
    // البحث بالإيدي أو الكود
    let admin = null;
    
    // أولاً: البحث بالكود (الأكثر شيوعاً)
    admin = await Admin.findOne({ code: cleanId });
    
    // إذا لم يتم العثور عليه بالكود، محاولة البحث بالإيدي (MongoDB _id)
    if (!admin) {
      try {
        admin = await Admin.findById(cleanId);
      } catch (e) {
        // إذا فشل البحث بالإيدي، نستمر
      }
    }
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // التحقق من الكود (استخدام password إذا كان موجوداً، وإلا استخدام code)
    const expectedCode = admin.password || admin.code;
    if (expectedCode.toUpperCase() !== cleanCode.toUpperCase()) {
      return res.status(401).json({ error: 'Invalid code' });
    }
    
    // إرجاع بيانات admin بدون password
    const adminData = admin.toObject();
    delete adminData.password;
    res.json(adminData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create admin
exports.addAdmin = async (req, res) => {
  try {
    const { code, name, email, phone } = req.body;
    
    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }
    
    // التحقق من عدم وجود كود مكرر
    const existingAdmin = await Admin.findOne({ code: code.trim().toUpperCase() });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin code already exists' });
    }
    
    const admin = new Admin({
      code: code.trim().toUpperCase(),
      name,
      email,
      phone,
    });
    
    await admin.save();
    res.status(201).json(admin);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Admin code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Update admin
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // إذا تم تحديث الكود، تحويله إلى uppercase
    if (updates.code) {
      updates.code = updates.code.trim().toUpperCase();
    }
    
    const admin = await Admin.findByIdAndUpdate(id, updates, { new: true });
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    res.json(admin);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Admin code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Delete admin
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findByIdAndDelete(id);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Check if admin exists by ID or code
exports.adminExists = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = id.trim().toUpperCase();
    
    let admin = null;
    try {
      // محاولة البحث بالإيدي (MongoDB _id)
      admin = await Admin.findById(cleanId);
    } catch (e) {
      // إذا فشل، البحث بالكود (case-insensitive)
      // البحث بالكود بعد تحويله إلى uppercase
      admin = await Admin.findOne({ code: cleanId });
    }
    
    // إذا لم يتم العثور عليه، نبحث مرة أخرى بالكود مباشرة (في حالة كان الكود مختلف)
    if (!admin) {
      admin = await Admin.findOne({ code: cleanId });
    }
    
    res.json({ exists: admin !== null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

