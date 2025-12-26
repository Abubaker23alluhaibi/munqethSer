const Order = require('../models/Order');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { calculateDistance } = require('../utils/distanceCalculator');
const { sendNotification, sendMulticastNotification } = require('../utils/notificationService');
const { normalizeIraqiPhone } = require('../utils/phoneUtils');
const { findUserByPhone } = require('./userController');

// Order expiration time in milliseconds (5 minutes)
const ORDER_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes

// Get all orders
exports.getOrders = async (req, res) => {
  try {
    const { supermarketId, status, type, driverId, customerPhone, includeExpired } = req.query;
    const query = {};
    
    if (supermarketId) query.supermarketId = supermarketId;
    if (status) query.status = status;
    if (type) query.type = type;
    if (driverId) query.driverId = driverId;
    if (customerPhone) {
      // تطبيع رقم الهاتف إلى الشكل الجديد (مع +964)
      const normalizedPhone = normalizeIraqiPhone(customerPhone);
      
      // تحويل إلى الشكل القديم (بدون +964) للبحث عن الطلبات القديمة
      let oldFormat = normalizedPhone;
      if (oldFormat.startsWith('+964')) {
        oldFormat = '0' + oldFormat.substring(4);
      }
      
      console.log('Searching for orders with customerPhone:', customerPhone);
      console.log('Normalized phone (new format):', normalizedPhone);
      console.log('Old format:', oldFormat);
      
      // البحث بعدة أشكال من رقم الهاتف (الجديد والقديم)
      query.$or = [
        { customerPhone: normalizedPhone }, // الشكل الجديد: +9647890009999
        { customerPhone: oldFormat }, // الشكل القديم: 07890009999
        { customerPhone: customerPhone }, // الشكل الأصلي المرسل
      ];
    }
    
    console.log('Getting orders with query:', JSON.stringify(query));
    
    let orders = await Order.find(query).sort({ createdAt: -1 });
    
    // إلغاء الطلبات المنتهية تلقائياً في الخلفية (بدون انتظار)
    const now = new Date();
    const expirationTime = new Date(now.getTime() - ORDER_EXPIRATION_TIME);
    
    const expiredOrdersToCancel = orders.filter(order => {
      return (order.status === 'pending' || order.status === 'ready' || order.status === 'preparing') &&
             !order.driverId &&
             order.createdAt < expirationTime &&
             order.status !== 'cancelled';
    });
    
    // إلغاء الطلبات المنتهية في الخلفية (بدون انتظار - لتجنب إبطاء الاستجابة)
    if (expiredOrdersToCancel.length > 0) {
      console.log(`🔄 Auto-cancelling ${expiredOrdersToCancel.length} expired orders in background...`);
      // استخدام setImmediate لتشغيل الإلغاء في الخلفية
      setImmediate(async () => {
        for (const order of expiredOrdersToCancel) {
          try {
            const orderDoc = await Order.findById(order._id);
            if (orderDoc && !orderDoc.driverId && orderDoc.status !== 'cancelled') {
              orderDoc.status = 'cancelled';
              orderDoc.updatedAt = new Date();
              await orderDoc.save();
              console.log(`✅ Auto-cancelled expired order: ${orderDoc._id}`);
            }
          } catch (error) {
            console.error(`❌ Error auto-cancelling order ${order._id}:`, error);
          }
        }
      });
      
      // تحديث حالة الطلبات في القائمة المحلية مباشرة (للفلترة)
      expiredOrdersToCancel.forEach(order => {
        order.status = 'cancelled';
        order.updatedAt = now;
      });
    }
    
    // إذا كان الطلب للطلبات المتاحة (pending/ready بدون driverId)، فلترة الطلبات المنتهية والملغاة
    // إلا إذا كان includeExpired=true (للأدمن فقط)
    const isAvailableOrdersQuery = !includeExpired && 
                                    (status === 'pending' || status === 'ready') && 
                                    !driverId &&
                                    !customerPhone; // لا نفلتر عند جلب طلبات زبون محدد
    
    if (isAvailableOrdersQuery) {
      const now = new Date();
      const expirationTime = new Date(now.getTime() - ORDER_EXPIRATION_TIME);
      
      const beforeFilter = orders.length;
      
      // أولاً، إلغاء الطلبات المنتهية تلقائياً قبل الفلترة
      const expiredOrdersToCancel = orders.filter(order => {
        return (order.status === 'pending' || order.status === 'ready' || order.status === 'preparing') &&
               !order.driverId &&
               order.createdAt < expirationTime &&
               order.status !== 'cancelled';
      });
      
      // إلغاء الطلبات المنتهية في الخلفية (بدون انتظار)
      if (expiredOrdersToCancel.length > 0) {
        console.log(`🔄 Auto-cancelling ${expiredOrdersToCancel.length} expired orders...`);
        expiredOrdersToCancel.forEach(async (order) => {
          try {
            const orderDoc = await Order.findById(order._id);
            if (orderDoc && !orderDoc.driverId && orderDoc.status !== 'cancelled') {
              orderDoc.status = 'cancelled';
              orderDoc.updatedAt = new Date();
              await orderDoc.save();
              console.log(`✅ Auto-cancelled expired order: ${orderDoc._id}`);
            }
          } catch (error) {
            console.error(`❌ Error auto-cancelling order ${order._id}:`, error);
          }
        });
      }
      
      orders = orders.filter(order => {
        // استبعاد الطلبات الملغاة
        if (order.status === 'cancelled') {
          return false;
        }
        
        // استبعاد الطلبات التي لها سائق (مقبولة)
        if (order.driverId) {
          return false;
        }
        
        // استبعاد الطلبات المنتهية (أكثر من 5 دقائق)
        if (order.createdAt < expirationTime) {
          return false;
        }
        
        return true;
      });
      
      console.log(`🔍 Filtered expired/cancelled orders: ${beforeFilter} -> ${orders.length} (removed ${beforeFilter - orders.length})`);
    }
    
    console.log(`Found ${orders.length} orders`);
    
    res.json(orders);
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create order
exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    
    if (!orderData.type || !orderData.customerName || !orderData.customerPhone) {
      return res.status(400).json({ error: 'Type, customerName, and customerPhone are required' });
    }
    
    // تطبيع رقم الهاتف إلى الشكل الجديد (مع +964)
    if (orderData.customerPhone) {
      orderData.customerPhone = normalizeIraqiPhone(orderData.customerPhone);
    }
    
    const order = new Order(orderData);
    await order.save();
    
    // Send notification to drivers based on service type
    let driverFcmTokens = [];
    let nearestDrivers = [];
    
    // For taxi and delivery: send to nearest 4 drivers only
    // For other services: send to all available drivers
    if (order.type === 'taxi' || order.type === 'delivery') {
      // Get customer location
      const customerLat = order.customerLatitude;
      const customerLng = order.customerLongitude;
      
      if (customerLat && customerLng) {
        // Get all available drivers for this service type with location
        const availableDrivers = await Driver.find({
          serviceType: order.type,
          isAvailable: true,
          currentLatitude: { $exists: true, $ne: null },
          currentLongitude: { $exists: true, $ne: null },
        });
        
        // Calculate distance for each driver
        const driversWithDistance = availableDrivers
          .map(driver => {
            const distance = calculateDistance(
              customerLat,
              customerLng,
              driver.currentLatitude,
              driver.currentLongitude
            );
            return {
              driver,
              distance: distance || Infinity, // Use Infinity if distance calculation fails
            };
          })
          .filter(item => item.distance !== Infinity)
          .sort((a, b) => a.distance - b.distance) // Sort by distance (nearest first)
          .slice(0, 4); // Take only the nearest 4 drivers
        
        nearestDrivers = driversWithDistance.map(item => item.driver);
        driverFcmTokens = driversWithDistance
          .map(item => item.driver.fcmToken)
          .filter(token => token);
        
        console.log(`📍 Found ${driversWithDistance.length} nearest drivers for ${order.type} order`);
        
        // Emit socket event to each nearest driver individually
        const io = req.app.get('io');
        if (io) {
          // Emit to all clients (general broadcast)
          io.emit('order:new', order.toObject());
          
          // Emit to each nearest driver's room (حتى لو لم يكن لديهم FCM token)
          nearestDrivers.forEach(driver => {
            if (driver.driverId) {
              io.to(`driver:${driver.driverId}`).emit('order:new', {
                ...order.toObject(),
                isForThisDriver: true,
              });
              console.log(`📡 Sent order to driver room: driver:${driver.driverId}`);
            }
          });
        }
      } else {
        console.warn(`⚠️ Customer location not provided for ${order.type} order, skipping driver notification`);
      }
    } else {
      // For other services (crane, fuel, car_emergency, maintenance, maid): send to all available drivers
      const availableDrivers = await Driver.find({
        serviceType: order.type,
        isAvailable: true,
      });
      
      driverFcmTokens = availableDrivers
        .map(d => d.fcmToken)
        .filter(token => token);
      
      console.log(`📢 Found ${availableDrivers.length} available drivers for ${order.type} order`);
      
      // Emit socket event for other services too
      const io = req.app.get('io');
      if (io) {
        io.emit('order:new', order.toObject());
        
        availableDrivers.forEach(driver => {
          if (driver.driverId) {
            io.to(`driver:${driver.driverId}`).emit('order:new', {
              ...order.toObject(),
              isForThisDriver: true,
            });
            console.log(`📡 Sent order to driver room: driver:${driver.driverId}`);
          }
        });
      }
    }
    
    // Send FCM notifications to selected drivers (if they have tokens)
    if (driverFcmTokens.length > 0) {
      try {
        const orderTypeNames = {
          delivery: 'توصيل',
          taxi: 'تكسي',
          maintenance: 'صيانة',
          car_emergency: 'طوارئ سيارات',
          crane: 'فكاك',
          fuel: 'بنزين',
          maid: 'عاملات',
          car_wash: 'غسيل سيارات',
        };
        
        await sendMulticastNotification(
          driverFcmTokens,
          'طلب جديد متاح',
          `طلب جديد من نوع ${orderTypeNames[order.type] || order.type}`,
          { 
            orderId: order._id.toString(), 
            type: 'new_order',
            orderType: order.type,
          }
        );
        console.log(`✅ Sent new order notification to ${driverFcmTokens.length} drivers (${order.type})`);
      } catch (notifError) {
        console.error('Error sending notification to drivers:', notifError);
      }
    } else {
      console.warn(`⚠️ No drivers found to notify for ${order.type} order`);
    }
    
    // Send notification to customer (order created successfully)
    try {
      const customer = await findUserByPhone(order.customerPhone);
      if (customer && customer.fcmToken) {
        await sendNotification(
          customer.fcmToken,
          'تم إنشاء طلبك بنجاح',
          `تم إنشاء طلبك بنجاح - رقم الطلب: ${order._id.toString().substring(0, 8)}`,
          { 
            orderId: order._id.toString(), 
            type: 'order_created',
            status: order.status,
          }
        );
        console.log('✅ Sent order created notification to customer');
      } else {
        const customer = await findUserByPhone(order.customerPhone);
        if (customer) {
          console.warn(`⚠️ Customer found but no FCM token for phone: ${order.customerPhone} - User needs to login again to register FCM token`);
        } else {
          console.warn(`⚠️ Customer not found for phone: ${order.customerPhone}`);
        }
      }
    } catch (notifError) {
      console.error('Error sending notification to customer:', notifError);
    }
    
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const oldOrder = await Order.findById(id);
    
    if (!oldOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // منع الإلغاء بعد قبول السائق أو وصوله للموقع
    if (status === 'cancelled') {
      // إذا كان السائق يلغي طلب قبل، يمكنه الإلغاء حتى بعد الوصول مع سبب
      const driverId = req.body.driverId || req.user?.driverId;
      const cancellationReason = req.body.cancellationReason;
      
      if (driverId && oldOrder.driverId && oldOrder.driverId.toString() === driverId.toString()) {
        // السائق يمكنه الإلغاء حتى بعد الوصول (arrived, inProgress) إذا كان هناك سبب
        const nonCancellableStatuses = ['delivered', 'completed'];
        if (nonCancellableStatuses.includes(oldOrder.status)) {
          return res.status(400).json({ 
            error: 'لا يمكن إلغاء الطلب بعد التسليم' 
          });
        }
        
        // إذا كان السائق يلغي بعد الوصول (arrived أو in_progress)، يجب أن يكون هناك سبب
        // ملاحظة: في قاعدة البيانات الحالة هي 'in_progress' (بشرطة سفلية)
        if ((oldOrder.status === 'arrived' || oldOrder.status === 'in_progress') && 
            (!cancellationReason || cancellationReason.trim().length === 0)) {
          return res.status(400).json({ 
            error: 'يرجى كتابة سبب الإلغاء' 
          });
        }
        // إذا كانت الحالة accepted أو قبلها، يمكن الإلغاء بدون سبب (أو مع سبب)
      } else {
        // للزبون: يمكن الإلغاء حتى بعد قبول السائق، لكن فقط قبل وصول السائق للموقع
        // أي يمكن الإلغاء في حالات: pending, preparing, ready, accepted
        // لا يمكن الإلغاء بعد: arrived, in_progress, delivered, completed
        const nonCancellableStatuses = ['arrived', 'in_progress', 'delivered', 'completed'];
        if (nonCancellableStatuses.includes(oldOrder.status)) {
          return res.status(400).json({ 
            error: 'لا يمكن إلغاء الطلب بعد وصول السائق للموقع' 
          });
        }
      }
    }
    
    // إعداد بيانات التحديث
    const updateData = {
      status,
      updatedAt: new Date(),
    };
    
    // حفظ سبب الإلغاء إذا كان موجوداً
    if (status === 'cancelled' && req.body.cancellationReason) {
      updateData.cancellationReason = req.body.cancellationReason;
    }
    
    const order = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    // Emit socket event (حتى لو لم يكن للمستخدم FCM token)
    const io = req.app.get('io');
    if (io) {
      // Emit to order tracking room
      io.to(`order:${id}`).emit('order:status:updated', {
        orderId: id,
        status,
        timestamp: new Date(),
      });
      
      // Emit general broadcast for real-time updates
      io.emit('order:status:updated', {
        orderId: id,
        status,
        timestamp: new Date(),
      });
      
      console.log(`📡 Emitted order status update via socket: ${id} -> ${status}`);
    }
    
    // Send FCM notifications based on status change (if FCM tokens exist)
    await sendStatusUpdateNotifications(oldOrder, order, status);
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Send notifications when order status changes
 */
async function sendStatusUpdateNotifications(oldOrder, newOrder, newStatus) {
  try {
    const statusMessages = {
      accepted: {
        title: 'تم قبول طلبك',
        body: 'تم قبول طلبك - السائق في الطريق إليك',
        customerTitle: 'تم قبول طلبك',
        customerBody: 'تم قبول طلبك من قبل سائق',
        notificationType: 'driver_accepted', // Match Flutter listener
      },
      arrived: {
        title: 'وصل السائق',
        body: 'وصل السائق إلى موقعك',
        customerTitle: 'وصل السائق',
        customerBody: 'وصل السائق إلى موقعك',
        notificationType: 'order_update',
      },
      in_progress: {
        title: 'السائق في الطريق',
        body: 'السائق في الطريق إليك',
        customerTitle: 'السائق في الطريق',
        customerBody: 'السائق في الطريق إليك',
        notificationType: 'driver_on_way', // Match Flutter listener
      },
      delivered: {
        title: 'تم التوصيل',
        body: 'تم التوصيل بنجاح',
        customerTitle: 'تم التوصيل',
        customerBody: 'تم التوصيل بنجاح - شكراً لاستخدامك تطبيق المنقذ',
        notificationType: 'order_update',
      },
      completed: {
        title: 'تم إكمال الطلب',
        body: 'تم إكمال الطلب بنجاح',
        customerTitle: 'تم إكمال الطلب',
        customerBody: 'تم إكمال طلبك بنجاح - شكراً لاستخدامك تطبيق المنقذ',
        notificationType: 'order_update',
      },
      cancelled: {
        title: 'تم إلغاء الطلب',
        body: 'تم إلغاء الطلب',
        customerTitle: 'تم إلغاء الطلب',
        customerBody: 'تم إلغاء طلبك',
        driverTitle: 'تم إلغاء الطلب',
        driverBody: 'تم إلغاء الطلب الذي قبلته',
        notificationType: 'order_update',
      },
    };
    
    const messageConfig = statusMessages[newStatus];
    if (!messageConfig) return;
    
    // Send notification to customer
    if (newOrder.customerPhone) {
      try {
        const customer = await User.findOne({ phone: newOrder.customerPhone });
        if (customer && customer.fcmToken) {
          // Convert all data values to strings for FCM
          const notificationData = {
            orderId: newOrder._id.toString(),
            type: messageConfig.notificationType || 'order_update',
            status: newStatus,
          };
          
          if (newOrder.driverId) {
            notificationData.driverId = newOrder.driverId.toString();
          }
          
          await sendNotification(
            customer.fcmToken,
            messageConfig.customerTitle,
            messageConfig.customerBody,
            notificationData
          );
          console.log(`✅ Sent status update notification to customer: ${newStatus} (type: ${messageConfig.notificationType})`);
        } else {
          if (customer) {
            console.warn(`⚠️ Customer found but no FCM token for phone: ${newOrder.customerPhone} - User needs to login again to register FCM token`);
          } else {
            console.warn(`⚠️ Customer not found for phone: ${newOrder.customerPhone}`);
          }
        }
      } catch (error) {
        console.error('Error sending notification to customer:', error);
      }
    }
    
    // Send notification to driver (if order has a driver)
    if (newOrder.driverId) {
      try {
        const driver = await Driver.findById(newOrder.driverId);
        if (driver && driver.fcmToken && newStatus !== 'cancelled') {
          // Convert all data values to strings for FCM
          const notificationData = {
            orderId: newOrder._id.toString(),
            type: 'order_update',
            status: newStatus,
          };
          
          await sendNotification(
            driver.fcmToken,
            messageConfig.title,
            messageConfig.body,
            notificationData
          );
          console.log(`✅ Sent status update notification to driver: ${newStatus}`);
        } else if (newStatus === 'cancelled' && driver && driver.fcmToken) {
          // Special notification for cancelled order to driver
          const notificationData = {
            orderId: newOrder._id.toString(),
            type: 'order_cancelled',
            status: newStatus,
          };
          
          await sendNotification(
            driver.fcmToken,
            messageConfig.driverTitle,
            messageConfig.driverBody,
            notificationData
          );
          console.log('✅ Sent cancellation notification to driver');
        }
      } catch (error) {
        console.error('Error sending notification to driver:', error);
      }
    }
  } catch (error) {
    console.error('Error in sendStatusUpdateNotifications:', error);
  }
}

// Find nearest driver
exports.findNearestDriver = async (req, res) => {
  try {
    const { latitude, longitude, serviceType } = req.query;
    
    if (!latitude || !longitude || !serviceType) {
      return res.status(400).json({ error: 'Latitude, longitude, and serviceType are required' });
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    const availableDrivers = await Driver.find({
      serviceType,
      isAvailable: true,
      currentLatitude: { $exists: true },
      currentLongitude: { $exists: true },
    });
    
    if (availableDrivers.length === 0) {
      return res.json({ driver: null, distance: null });
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
    
    const nearest = driversWithDistance[0];
    
    res.json({
      driver: nearest.driver,
      distance: nearest.distance,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Accept order by driver
exports.acceptOrderByDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;
    
    if (!driverId) {
      return res.status(400).json({ error: 'Driver ID is required' });
    }
    
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.driverId) {
      return res.status(400).json({ error: 'Order already accepted' });
    }
    
    // جميع أنواع الطلبات تبدأ بحالة accepted عند القبول
    const newStatus = 'accepted';
    
    order.driverId = driverId;
    order.driverAcceptedAt = new Date();
    order.status = newStatus;
    order.updatedAt = new Date();
    
    await order.save();
    
    // Emit socket event (حتى لو لم يكن للمستخدم FCM token)
    const io = req.app.get('io');
    if (io) {
      // Emit to order tracking room
      io.to(`order:${id}`).emit('order:status:updated', {
        orderId: id,
        status: newStatus,
        driverId,
        timestamp: new Date(),
      });
      
      // Emit general broadcast for real-time updates
      io.emit('order:status:updated', {
        orderId: id,
        status: newStatus,
        driverId,
        timestamp: new Date(),
      });
      
      console.log(`📡 Emitted order status update via socket: ${id} -> ${newStatus}`);
    }
    
    // Send FCM notification to customer that order was accepted
    try {
      const customer = await findUserByPhone(order.customerPhone);
      if (customer && customer.fcmToken) {
        // Convert data values to strings for FCM
        const notificationData = {
          orderId: order._id.toString(),
          type: 'driver_accepted', // Use driver_accepted to match Flutter
          status: newStatus,
          driverId: driverId.toString(),
        };
        
        await sendNotification(
          customer.fcmToken,
          'تم قبول طلبك',
          'تم قبول طلبك من قبل سائق',
          notificationData
        );
        console.log('✅ Sent order accepted notification to customer');
      } else {
        if (customer) {
          console.warn(`⚠️ Customer found but no FCM token for phone: ${order.customerPhone} - User needs to login again to register FCM token`);
        } else {
          console.warn(`⚠️ Customer not found for phone: ${order.customerPhone}`);
        }
      }
    } catch (notifError) {
      console.error('Error sending notification to customer:', notifError);
    }
    
    // Send notification to other available drivers that order was taken
    try {
      const otherAvailableDrivers = await Driver.find({
        serviceType: order.type,
        isAvailable: true,
        _id: { $ne: driverId },
      });
      
      const otherDriverTokens = otherAvailableDrivers
        .map(d => d.fcmToken)
        .filter(token => token);
      
      if (otherDriverTokens.length > 0) {
        await sendMulticastNotification(
          otherDriverTokens,
          'طلب تم قبوله',
          'تم قبول الطلب من سائق آخر',
          { 
            orderId: order._id.toString(), 
            type: 'order_taken',
          }
        );
        console.log(`✅ Sent order taken notification to ${otherDriverTokens.length} other drivers`);
      }
    } catch (notifError) {
      console.error('Error sending notification to other drivers:', notifError);
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Check and expire orders that haven't been accepted within 5 minutes
 * This function should be called periodically (e.g., every minute)
 */
exports.checkAndExpireOrders = async (io) => {
  try {
    const now = new Date();
    const expirationTime = new Date(now.getTime() - ORDER_EXPIRATION_TIME);
    
    // Find orders that:
    // 1. Are still pending or ready (not accepted yet)
    // 2. Were created more than 5 minutes ago
    // 3. Haven't been cancelled or completed
    // 4. Don't have a driver assigned
    const expiredOrders = await Order.find({
      status: { $in: ['pending', 'ready', 'preparing'] },
      createdAt: { $lt: expirationTime },
      $or: [
        { driverId: { $exists: false } },
        { driverId: null }
      ],
    });
    
    console.log(`🔍 Checking for expired orders... Found ${expiredOrders.length} expired orders`);
    
    for (const order of expiredOrders) {
      try {
        // التحقق مرة أخرى قبل الإلغاء (لتجنب race conditions)
        const currentOrder = await Order.findById(order._id);
        if (!currentOrder || currentOrder.driverId || currentOrder.status === 'cancelled') {
          console.log(`⏭️ Skipping order ${order._id} - already processed`);
          continue;
        }
        
        // Update order status to cancelled
        currentOrder.status = 'cancelled';
        currentOrder.updatedAt = new Date();
        await currentOrder.save();
        
        console.log(`⏰ Order ${currentOrder._id} expired (created at ${currentOrder.createdAt}, expired at ${now})`);
        
        // Send notification to customer
        const customer = await findUserByPhone(currentOrder.customerPhone);
        if (customer && customer.fcmToken) {
          const notificationData = {
            orderId: currentOrder._id.toString(),
            type: 'order_expired',
            status: 'cancelled',
          };
          
          await sendNotification(
            customer.fcmToken,
            'غير متوفرين',
            'عذراً، لا يوجد سائقين متاحين حالياً. يرجى المحاولة مرة أخرى لاحقاً.',
            notificationData
          );
          
          console.log(`✅ Sent expiration notification to customer for order ${currentOrder._id}`);
        } else {
          if (customer) {
            console.warn(`⚠️ Customer found but no FCM token for phone: ${currentOrder.customerPhone} - User needs to login again to register FCM token`);
          } else {
            console.warn(`⚠️ Customer not found for phone: ${currentOrder.customerPhone}`);
          }
        }
        
        // Emit socket event
        if (io) {
          io.to(`order:${currentOrder._id}`).emit('order:status:updated', {
            orderId: currentOrder._id.toString(),
            status: 'cancelled',
            reason: 'expired',
            timestamp: new Date(),
          });
          
          io.emit('order:status:updated', {
            orderId: currentOrder._id.toString(),
            status: 'cancelled',
            reason: 'expired',
            timestamp: new Date(),
          });
          
          console.log(`📡 Emitted order expiration via socket: ${currentOrder._id}`);
        }
      } catch (error) {
        console.error(`❌ Error processing expired order ${order._id}:`, error);
      }
    }
    
    return expiredOrders.length;
  } catch (error) {
    console.error('❌ Error checking expired orders:', error);
    return 0;
  }
};

/**
 * Clean up old expired orders on server startup
 * This function should be called once when the server starts
 */
exports.cleanupExpiredOrders = async (io) => {
  try {
    const now = new Date();
    const expirationTime = new Date(now.getTime() - ORDER_EXPIRATION_TIME);
    
    console.log('🧹 Starting cleanup of expired orders...');
    
    // Find all old expired orders that haven't been cancelled yet
    const expiredOrders = await Order.find({
      status: { $in: ['pending', 'ready', 'preparing'] },
      createdAt: { $lt: expirationTime },
      $or: [
        { driverId: { $exists: false } },
        { driverId: null }
      ],
    });
    
    console.log(`🧹 Found ${expiredOrders.length} expired orders to cleanup`);
    
    let cleanedCount = 0;
    for (const order of expiredOrders) {
      try {
        // تحديث حالة الطلب إلى ملغى
        order.status = 'cancelled';
        order.updatedAt = new Date();
        await order.save();
        
        cleanedCount++;
        console.log(`✅ Cleaned up expired order ${order._id} (created: ${order.createdAt})`);
      } catch (error) {
        console.error(`❌ Error cleaning up order ${order._id}:`, error);
      }
    }
    
    console.log(`🧹 Cleanup completed: ${cleanedCount} orders cancelled`);
    return cleanedCount;
  } catch (error) {
    console.error('❌ Error in cleanup expired orders:', error);
    return 0;
  }
};


