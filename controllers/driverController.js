const Driver = require('../models/Driver');
const Order = require('../models/Order');
const User = require('../models/User');
const mongoose = require('mongoose');
const { calculateDistance } = require('../utils/distanceCalculator');
const { sendNotification } = require('../utils/notificationService');
const { findUserByPhone } = require('./userController');
const logger = require('../utils/logger');

// Get all drivers
exports.getAllDrivers = async (req, res) => {
  try {
    const { serviceType, isAvailable } = req.query;
    const query = {};
    
    // فلترة السائقين المحذوفين وغير النشطين
    query.isDeleted = { $ne: true }; // ليس محذوف
    query.isActive = { $ne: false }; // نشط (أو غير محدد)
    
    if (serviceType) query.serviceType = serviceType;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';
    
    const drivers = await Driver.find(query).sort({ createdAt: -1 });
    
    // التأكد من أن جميع السائقين لديهم driverId (للتحديث التلقائي للبيانات القديمة)
    const updatedDrivers = await Promise.all(drivers.map(async (driver) => {
      // إذا لم يكن driverId موجود، نستخدم _id كـ driverId
      if (!driver.driverId || driver.driverId.trim() === '') {
        logger.debug(`Updating driver ${driver._id}: missing driverId, using _id as fallback`);
        driver.driverId = driver._id.toString();
        await driver.save();
      }
      return driver;
    }));
    
    res.json(updatedDrivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get driver by ID, driverId, or code
exports.getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = id.trim().toUpperCase();
    
    logger.debug(`Searching for driver with ID: ${cleanId}`);
    
    let driver = null;
    
    // التحقق من includeDeleted query parameter (للأدمن فقط)
    const includeDeleted = req.query.includeDeleted === 'true';
    
    // أولاً: البحث بالمعرف المخصص (driverId)
    const driverIdQuery = { driverId: cleanId };
    if (!includeDeleted) {
      driverIdQuery.isDeleted = { $ne: true };
      driverIdQuery.isActive = { $ne: false };
    }
    driver = await Driver.findOne(driverIdQuery);
    if (driver) {
      logger.debug(`Driver found by driverId: ${driver.name}, driverId: ${driver.driverId}`);
    }
    
    // ثانياً: البحث بالكود
    if (!driver) {
      const codeQuery = { code: cleanId };
      if (!includeDeleted) {
        codeQuery.isDeleted = { $ne: true };
        codeQuery.isActive = { $ne: false };
      }
      driver = await Driver.findOne(codeQuery);
      if (driver) {
        logger.debug(`Driver found by code: ${driver.name}, code: ${driver.code}`);
      }
    }
    
    // ثالثاً: البحث بالإيدي (MongoDB _id)
    if (!driver) {
      try {
        // التحقق إذا كان ID صالح لـ MongoDB ObjectId (24 حرف hex)
        if (/^[0-9a-fA-F]{24}$/i.test(id.trim())) {
          driver = await Driver.findById(id.trim());
          if (driver) {
            // التحقق من الحذف إذا لم يكن includeDeleted
            if (!includeDeleted && (driver.isDeleted === true || driver.isActive === false)) {
              driver = null;
            } else {
              logger.debug(`Driver found by MongoDB _id: ${driver.name}, _id: ${driver._id}`);
            }
          }
        }
      } catch (e) {
        // إذا فشل البحث بالإيدي، نستمر
      }
    }
    
    if (!driver) {
      logger.debug(`Driver not found with ID: ${cleanId}`);
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    logger.debug(`Returning driver: ${driver.name}, driverId: ${driver.driverId}`);
    res.json(driver);
  } catch (error) {
    logger.error('Error in getDriverById:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create driver
exports.addDriver = async (req, res) => {
  try {
    const driverData = req.body;
    
    if (!driverData.name || !driverData.phone || !driverData.serviceType) {
      return res.status(400).json({ error: 'Name, phone, and serviceType are required' });
    }
    
    // التأكد من وجود driverId وتحويله إلى uppercase
    if (!driverData.driverId) {
      return res.status(400).json({ error: 'Driver ID is required' });
    }
    driverData.driverId = driverData.driverId.trim().toUpperCase();
    
    // التحقق من وجود البيانات المكررة قبل المحاولة (المعرف والهاتف فقط، الكود يمكن أن يتكرر)
    const existingDriverId = await Driver.findOne({ driverId: driverData.driverId });
    if (existingDriverId) {
      return res.status(400).json({ 
        error: `المعرف (${driverData.driverId}) موجود مسبقاً` 
      });
    }
    
    const existingPhone = await Driver.findOne({ phone: driverData.phone });
    if (existingPhone) {
      return res.status(400).json({ 
        error: `رقم الهاتف (${driverData.phone}) موجود مسبقاً` 
      });
    }
    
    // طباعة البيانات المستلمة للتأكد
    logger.debug('Received driver data:', JSON.stringify(driverData, null, 2));
    logger.debug('driverId:', driverData.driverId);
    
    const driver = new Driver(driverData);
    
    // طباعة البيانات قبل الحفظ
    logger.debug('Driver object before save:', {
      driverId: driver.driverId,
      code: driver.code,
      name: driver.name,
      phone: driver.phone,
    });
    
    await driver.save();
    
    // إعادة تحميل السائق من قاعدة البيانات للتأكد من أن جميع الحقول محفوظة
    const savedDriver = await Driver.findById(driver._id);
    
    // طباعة البيانات بعد الحفظ للتأكد
    logger.debug('Driver saved successfully!');
    logger.debug('MongoDB _id:', savedDriver._id);
    logger.debug('driverId:', savedDriver.driverId);
    logger.debug('code:', savedDriver.code);
    logger.debug('name:', savedDriver.name);
    
    // إرجاع السائق المحفوظ مع جميع الحقول
    res.status(201).json(savedDriver);
  } catch (error) {
    logger.error('Error creating driver:', error);
    
    if (error.code === 11000) {
      // تحديد الحقل المكرر (المعرف أو الهاتف فقط، الكود يمكن أن يتكرر)
      logger.debug('Duplicate key error - keyPattern:', error.keyPattern);
      logger.debug('Duplicate key error - keyValue:', error.keyValue);
      
      const keyPattern = error.keyPattern || {};
      const keyValue = error.keyValue || {};
      
      // تجاهل خطأ code المكرر - السماح بالرمز المكرر
      if (keyPattern.code) {
        logger.debug('⚠️ Duplicate code detected, but allowing it. Removing unique index from MongoDB is recommended.');
        logger.debug('   Run: npm run remove-code-index');
        // محاولة إعادة الحفظ بدون التحقق من unique constraint
        try {
          // إزالة code مؤقتاً ثم إضافته مرة أخرى
          const codeValue = driverData.code;
          delete driverData.code;
          const driver = new Driver(driverData);
          await driver.save();
          // تحديث code بعد الحفظ
          driver.code = codeValue;
          await driver.save({ validateBeforeSave: false });
          const savedDriver = await Driver.findById(driver._id);
          return res.status(201).json(savedDriver);
        } catch (retryError) {
          logger.error('Error retrying save without code constraint:', retryError);
          // إذا فشل، نعامل code كخطأ عادي ونطلب إزالة الـ index
          return res.status(400).json({ 
            error: `الرمز (${keyValue.code}) موجود مسبقاً. يرجى تشغيل: npm run remove-code-index لإزالة القيد.` 
          });
        }
      }
      
      let field = null;
      let duplicateValue = null;
      
      if (keyPattern.driverId) {
        field = 'driverId';
        duplicateValue = keyValue.driverId || req.body.driverId;
      } else if (keyPattern.phone) {
        field = 'phone';
        duplicateValue = keyValue.phone || req.body.phone;
      }
      
      let errorMessage = '';
      if (field === 'driverId') {
        errorMessage = `المعرف (${duplicateValue}) موجود مسبقاً`;
      } else if (field === 'phone') {
        errorMessage = `رقم الهاتف (${duplicateValue}) موجود مسبقاً`;
      } else {
        // إذا كان الحقل غير معروف، نطبع معلومات الخطأ
        errorMessage = `البيانات موجودة مسبقاً. الحقل المكرر: ${JSON.stringify(keyPattern)}`;
        logger.error('Unknown duplicate field:', keyPattern);
      }
      
      return res.status(400).json({ error: errorMessage });
    }
    
    logger.error('Unexpected error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Update driver
exports.updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      skipCodeValidation, 
      allowDuplicateCode, 
      ignoreCodeCheck,
      originalCode,
      currentDriverId,
      isUpdate,
      ...updates 
    } = req.body;
    
    // التحقق من وجود السائق
    const existingDriver = await Driver.findById(id);
    if (!existingDriver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    // إذا كان هناك تحديث للرمز
    if (updates.code) {
      // إذا كان الرمز الجديد هو نفس الرمز الحالي، لا حاجة للتحديث
      if (updates.code === existingDriver.code) {
        delete updates.code; // إزالة code من التحديثات
      } else {
        // السماح بالرمز المكرر - لا نتحقق من التكرار
        logger.debug('Updating code - allowing duplicates');
      }
    }
    
    // إزالة المعاملات الخاصة من updates قبل الحفظ
    delete updates.skipCodeValidation;
    delete updates.allowDuplicateCode;
    delete updates.ignoreCodeCheck;
    delete updates.originalCode;
    delete updates.currentDriverId;
    delete updates.isUpdate;
    
    // تحديث السائق
    // إذا كان هناك تحديث للرمز، نحاول تحديث code بشكل منفصل
    // لأن MongoDB قد يكون لديه unique index على code
    if (updates.code) {
      logger.debug('Attempting to update code with allowDuplicateCode flag');
      logger.debug('Updating code from', existingDriver.code, 'to', updates.code);
      
      const codeValue = updates.code; // حفظ قيمة code قبل حذفها
      delete updates.code; // إزالة code من updates مؤقتاً
      
      try {
        // تحديث الحقول الأخرى أولاً
        if (Object.keys(updates).length > 0) {
          await Driver.findByIdAndUpdate(
            id,
            updates,
            { runValidators: false }
          );
        }
        
        // محاولة تحديث code بشكل منفصل
        // نستخدم collection.updateOne مباشرة مع unset ثم set لتجاوز unique constraint
        const objectId = new mongoose.Types.ObjectId(id);
        
        logger.debug('Step 1: Removing old code...');
        // أولاً: إزالة code القديم
        const unsetResult = await Driver.collection.updateOne(
          { _id: objectId },
          { $unset: { code: "" } }
        );
        logger.debug('Unset result:', unsetResult);
        
        // انتظار قليل للتأكد من أن MongoDB قام بإزالة code
        await new Promise(resolve => setTimeout(resolve, 100));
        
        logger.debug('Step 2: Setting new code...');
        // ثانياً: إضافة code الجديد
        // محاولة استخدام hint لتجاوز unique index (إذا كان موجود)
        try {
          const setResult = await Driver.collection.updateOne(
            { _id: objectId },
            { $set: { code: codeValue } },
            { hint: { _id: 1 } } // استخدام hint على _id لتجاوز unique index على code
          );
          logger.debug('Set result:', setResult);
          
          if (setResult.modifiedCount === 0 && setResult.matchedCount > 0) {
            logger.debug('Code might already be set, checking...');
          }
          
          logger.debug('Code updated successfully using two-step update');
        } catch (setError) {
          // إذا فشل بسبب unique constraint، نحاول بدون hint
          logger.debug('First attempt failed, trying without hint...');
          if (setError.code === 11000) {
            logger.error('❌ Still getting duplicate key error. Unique index must be removed from MongoDB.');
            logger.error('   Please run: npm run remove-code-index');
            throw new Error('Cannot update code: unique index exists on code field. Please remove it using: npm run remove-code-index');
          }
          throw setError;
        }
        
        // إعادة تحميل السائق المحدث
        const driver = await Driver.findById(id);
        if (!driver) {
          return res.status(404).json({ error: 'Driver not found' });
        }
        
        res.json(driver);
      } catch (updateError) {
        logger.error('Error in two-step code update:', updateError);
        
        // إذا فشل، نعيد code إلى updates ونحاول الطريقة العادية
        updates.code = codeValue;
        
        // محاولة تحديث عادي (قد يفشل بسبب unique constraint)
        try {
          const driver = await Driver.findByIdAndUpdate(
            id, 
            updates, 
            { 
              new: true, 
              runValidators: false
            }
          );
          
          if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
          }
          
          res.json(driver);
        } catch (finalError) {
          // إذا فشل كل شيء، نرمي الخطأ
          throw finalError;
        }
      }
    } else {
      // تحديث عادي بدون تجاوز unique constraint
      const driver = await Driver.findByIdAndUpdate(
        id, 
        updates, 
        { 
          new: true, 
          runValidators: false // تخطي validators لتجنب مشكلة unique constraint
        }
      );
      
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }
      
      res.json(driver);
    }
  } catch (error) {
    logger.error('Error updating driver:', error);
    
    // معالجة خطأ unique constraint
    if (error.code === 11000) {
      // تحديد الحقل المكرر
      const keyPattern = error.keyPattern || {};
      const keyValue = error.keyValue || {};
      
      // تجاهل خطأ code المكرر - السماح بالرمز المكرر
      if (keyPattern.code) {
        logger.debug('⚠️ Duplicate code detected during update, but allowing it. Removing unique index from MongoDB is recommended.');
        logger.debug('   Run: npm run remove-code-index');
        // محاولة تحديث code بشكل منفصل
        try {
          const codeValue = updates.code;
          delete updates.code;
          // تحديث الحقول الأخرى أولاً
          if (Object.keys(updates).length > 0) {
            await Driver.findByIdAndUpdate(id, updates, { runValidators: false });
          }
          // تحديث code بشكل منفصل
          const objectId = new mongoose.Types.ObjectId(id);
          await Driver.collection.updateOne(
            { _id: objectId },
            { $set: { code: codeValue } }
          );
          const driver = await Driver.findById(id);
          return res.json(driver);
        } catch (retryError) {
          logger.error('Error retrying update without code constraint:', retryError);
          return res.status(400).json({ 
            error: `الرمز (${keyValue.code || req.body.code}) موجود مسبقاً. يرجى تشغيل: npm run remove-code-index لإزالة القيد.` 
          });
        }
      }
      
      return res.status(400).json({ 
        error: 'البيانات موجودة مسبقاً. يرجى التحقق من القيم المدخلة.' 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
};

// Update driver location
// Cache for rate limiting (last update time per driver)
const locationUpdateCache = new Map();

exports.updateDriverLocation = async (req, res) => {
  try {
    // Support both /:id/location and /me/location endpoints
    let driverId = req.params.id;
    if (!driverId && req.body.driverId) {
      driverId = req.body.driverId;
    }
    
    if (!driverId) {
      return res.status(400).json({ error: 'Driver ID is required' });
    }
    
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    // التحقق من صحة الإحداثيات
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Invalid latitude or longitude values' });
    }
    
    // الحصول على بيانات السائق الحالية للتحقق من التغيير
    const existingDriver = await Driver.findById(driverId);
    if (!existingDriver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    // Rate limiting: منع التحديثات المتكررة جداً (أقل من ثانية واحدة)
    const now = Date.now();
    const lastUpdate = locationUpdateCache.get(driverId);
    if (lastUpdate && (now - lastUpdate) < 1000) {
      // تحديث سريع جداً، نرجع النجاح بدون تحديث قاعدة البيانات
      return res.json({
        ...existingDriver.toObject(),
        currentLatitude: lat,
        currentLongitude: lng,
        message: 'Location update rate limited'
      });
    }
    
    // التحقق من صحة الموقع (منع القفزات الكبيرة غير المنطقية)
    if (existingDriver.currentLatitude && existingDriver.currentLongitude) {
      const distance = calculateDistance(
        existingDriver.currentLatitude,
        existingDriver.currentLongitude,
        lat,
        lng
      );
      
      // إذا كان التغيير أكثر من 10 كيلومتر في تحديث واحد، قد يكون خطأ GPS
      // نسمح به لكن نطبع تحذير
      if (distance && distance > 10) {
        logger.warn(`⚠️ Large location jump detected for driver ${driverId}: ${distance.toFixed(2)} km`);
        // نسمح بالتحديث لكن قد يكون خطأ GPS
      }
      
      // إذا كان التغيير أقل من 5 متر، نتخطى التحديث (توفير موارد)
      if (distance && distance < 0.005) {
        locationUpdateCache.set(driverId, now);
        return res.json({
          ...existingDriver.toObject(),
          message: 'Location change too small, update skipped'
        });
      }
    }
    
    // تحديث الموقع
    const driver = await Driver.findByIdAndUpdate(
      driverId,
      {
        currentLatitude: lat,
        currentLongitude: lng,
        lastLocationUpdate: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    );
    
    // تحديث cache
    locationUpdateCache.set(driverId, now);
    
    // تنظيف cache القديم (أكثر من 5 دقائق)
    if (locationUpdateCache.size > 1000) {
      for (const [id, time] of locationUpdateCache.entries()) {
        if (now - time > 300000) { // 5 minutes
          locationUpdateCache.delete(id);
        }
      }
    }
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`driver:${driverId}`).emit('driver:location:updated', {
        driverId: driverId,
        latitude: lat,
        longitude: lng,
        timestamp: new Date(),
      });
    }
    
    // Check for active orders and send approaching notification to customers
    // نتحقق من الإشعارات فقط كل 5 ثواني لتوفير الموارد
    const shouldCheckNotifications = !lastUpdate || (now - lastUpdate) >= 5000;
    
    if (shouldCheckNotifications) {
      try {
        const activeOrders = await Order.find({
          driverId: driverId,
          status: { $in: ['accepted', 'arrived', 'in_progress'] },
          customerLatitude: { $exists: true, $ne: null },
          customerLongitude: { $exists: true, $ne: null },
        });
        
        for (const order of activeOrders) {
          const distance = calculateDistance(
            lat,
            lng,
            order.customerLatitude,
            order.customerLongitude
          );
          
          // إشعار الاقتراب عند وصول السائق إلى مسافة أقل من 500 متر
          if (distance && distance < 0.5 && !order.driverApproachingNotified) {
            // الحصول على معلومات العميل
            const customer = await findUserByPhone(order.customerPhone);
            
            if (customer && customer.fcmToken) {
              await sendNotification(
                customer.fcmToken,
                'اقترب السائق',
                'السائق في طريقه إليك الآن',
                {
                  type: 'driver_approaching',
                  orderId: order._id.toString(),
                  driverId: driverId.toString(),
                  distance: distance.toString(),
                }
              );
              
              logger.debug(`✅ Sent approaching notification to customer for order ${order._id}`);
              
              // تحديث الطلب لتجنب إرسال إشعارات متعددة
              order.driverApproachingNotified = true;
              await order.save();
            }
          }
        }
      } catch (error) {
        logger.error('Error checking for approaching notifications:', error);
        // لا نفشل الطلب الرئيسي إذا فشل إرسال الإشعار
      }
    }
    
    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete driver (soft delete)
exports.deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    
    // البحث عن السائق
    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    // Soft delete: وضع علامة isDeleted و isActive
    driver.isDeleted = true;
    driver.isActive = false;
    driver.updatedAt = new Date();
    await driver.save();
    
    logger.debug(`✅ Driver ${driver.name} (${driver.driverId}) marked as deleted`);
    
    res.json({ 
      message: 'Driver deleted successfully',
      driver 
    });
  } catch (error) {
    logger.error('Error deleting driver:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get available drivers
exports.getAvailableDrivers = async (req, res) => {
  try {
    const { serviceType } = req.query;
    const query = { 
      isAvailable: true,
      isDeleted: { $ne: true }, // ليس محذوف
      isActive: { $ne: false }, // نشط
    };
    
    if (serviceType) {
      query.serviceType = serviceType;
    }
    
    const drivers = await Driver.find(query);
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update driver FCM token
exports.updateFcmToken = async (req, res) => {
  try {
    const { id } = req.params;
    const { fcmToken } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({ error: 'FCM token is required' });
    }
    
    const driver = await Driver.findById(id);
    
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    // Normalize fcmToken to array (handle old string values for backwards compatibility)
    let tokens = Array.isArray(driver.fcmToken) ? driver.fcmToken : (driver.fcmToken ? [driver.fcmToken] : []);
    
    // Add new token if it doesn't exist (support multiple devices)
    if (!tokens.includes(fcmToken)) {
      tokens.push(fcmToken);
      logger.success(`✅ Added FCM token for driver ${driver.name} (${driver.driverId}) - now has ${tokens.length} device(s)`);
    }
    
    driver.fcmToken = tokens;
    driver.updatedAt = new Date();
    await driver.save();
    
    res.json({ message: 'FCM token updated successfully', driver });
  } catch (error) {
    logger.error('Error updating driver FCM token:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update driver FCM token by driverId
exports.updateFcmTokenByDriverId = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { fcmToken } = req.body;
    
    logger.debug(`📱 Received FCM token update request for driverId: ${driverId}`);
    logger.debug(`   FCM token: ${fcmToken ? fcmToken.substring(0, 20) + '...' : 'MISSING'}`);
    
    if (!fcmToken) {
      logger.warn(`❌ FCM token is missing in request body for driverId: ${driverId}`);
      return res.status(400).json({ error: 'FCM token is required' });
    }
    
    logger.debug(`🔍 Searching for driver with driverId: ${driverId.toUpperCase()}`);
    const driver = await Driver.findOne({ driverId: driverId.toUpperCase() });
    
    if (!driver) {
      logger.warn(`❌ Driver not found for driverId: ${driverId} when updating FCM token`);
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    logger.debug(`✅ Driver found: ${driver.name} (${driver.driverId})`);
    
    // Normalize fcmToken to array (handle old string values for backwards compatibility)
    let tokens = Array.isArray(driver.fcmToken) ? driver.fcmToken : (driver.fcmToken ? [driver.fcmToken] : []);
    
    // Add new token if it doesn't exist (support multiple devices)
    const oldTokensCount = tokens.length;
    if (!tokens.includes(fcmToken)) {
      tokens.push(fcmToken);
      logger.success(`✅ Added FCM token for driver ${driver.name} (${driver.driverId}) - now has ${tokens.length} device(s)`);
      logger.debug(`   New token: ${fcmToken.substring(0, 20)}...`);
    } else {
      logger.debug(`FCM token already exists for driver ${driver.name} (${driver.driverId})`);
    }
    
    driver.fcmToken = tokens;
    driver.updatedAt = new Date();
    await driver.save();
    
    res.json({ message: 'FCM token updated successfully', driver });
  } catch (error) {
    logger.error('Error updating driver FCM token:', error);
    res.status(500).json({ error: error.message });
  }
};

// Check FCM token status for a driver by driverId
exports.checkFcmTokenStatus = async (req, res) => {
  try {
    const { driverId } = req.params;
    logger.debug(`🔍 Checking FCM token status for driverId: ${driverId}`);
    
    const driver = await Driver.findOne({ driverId: driverId.toUpperCase() });
    
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    // Normalize fcmToken to array (handle old string values for backwards compatibility)
    const tokens = Array.isArray(driver.fcmToken) ? driver.fcmToken : (driver.fcmToken ? [driver.fcmToken] : []);
    const validTokens = tokens.filter(token => token && token.trim().length > 0);
    const hasToken = validTokens.length > 0;
    
    logger.debug(`📱 FCM token status for ${driver.name} (${driver.driverId}): ${hasToken ? `EXISTS (${validTokens.length} device(s))` : 'MISSING'}`);
    
    res.json({
      driverId: driver.driverId,
      deviceCount: validTokens.length,
      name: driver.name,
      hasFcmToken: hasToken,
      fcmTokenPreview: validTokens.length > 0 ? validTokens[0].substring(0, 20) + '...' : null,
      updatedAt: driver.updatedAt,
    });
  } catch (error) {
    logger.error('Error checking FCM token status:', error);
    res.status(500).json({ error: error.message });
  }
};

// Find nearest drivers (returns up to 4 nearest drivers)
exports.findNearestDriver = async (req, res) => {
  try {
    const { latitude, longitude, serviceType, limit } = req.query;
    
    if (!latitude || !longitude || !serviceType) {
      return res.status(400).json({ error: 'Latitude, longitude, and serviceType are required' });
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const maxDrivers = limit ? parseInt(limit) : 4; // Default to 4 drivers
    
    const availableDrivers = await Driver.find({
      serviceType,
      isAvailable: true,
      isDeleted: { $ne: true }, // ليس محذوف
      isActive: { $ne: false }, // نشط
      currentLatitude: { $exists: true },
      currentLongitude: { $exists: true },
    });
    
    if (availableDrivers.length === 0) {
      return res.json({ drivers: [], distances: [] });
    }
    
    // Calculate distances
    const driversWithDistance = availableDrivers.map(driver => {
      const distance = calculateDistance(
        lat,
        lng,
        driver.currentLatitude,
        driver.currentLongitude
      );
      return {
        driver,
        distance,
      };
    });
    
    // Sort by distance
    driversWithDistance.sort((a, b) => a.distance - b.distance);
    
    // Get up to 4 nearest drivers
    const nearestDrivers = driversWithDistance.slice(0, maxDrivers);
    
    // For backward compatibility, also return the first driver as 'driver'
    res.json({
      drivers: nearestDrivers.map(item => item.driver),
      distances: nearestDrivers.map(item => item.distance),
      driver: nearestDrivers.length > 0 ? nearestDrivers[0].driver : null,
      distance: nearestDrivers.length > 0 ? nearestDrivers[0].distance : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

