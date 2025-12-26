const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: String,
  productName: String,
  price: Number,
  quantity: Number,
  productImage: String,
});

const orderSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['delivery', 'taxi', 'maintenance', 'car_emergency', 'crane', 'fuel', 'maid', 'car_wash'],
  },
  supermarketId: {
    type: String,
  },
  customerName: {
    type: String,
    required: true,
  },
  customerPhone: {
    type: String,
    required: true,
  },
  customerAddress: {
    type: String,
  },
  customerLatitude: {
    type: Number,
  },
  customerLongitude: {
    type: Number,
  },
  items: [orderItemSchema],
  status: {
    type: String,
    required: true,
    enum: ['pending', 'preparing', 'ready', 'accepted', 'arrived', 'in_progress', 'delivered', 'completed', 'cancelled'],
    default: 'pending',
  },
  total: {
    type: Number,
  },
  fare: {
    type: Number,
  },
  deliveryFee: {
    type: Number,
  },
  notes: {
    type: String,
  },
  driverId: {
    type: String,
  },
  driverAcceptedAt: {
    type: Date,
  },
  driverApproachingNotified: {
    type: Boolean,
    default: false,
  },
  destinationLatitude: {
    type: Number,
  },
  destinationLongitude: {
    type: Number,
  },
  destinationAddress: {
    type: String,
  },
  fuelQuantity: {
    type: Number,
  },
  maidServiceType: {
    type: String,
  },
  maidWorkHours: {
    type: Number,
  },
  maidWorkDate: {
    type: Date,
  },
  emergencyReason: {
    type: String,
  },
  carWashSize: {
    type: String,
  },
  cancellationReason: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

orderSchema.index({ driverId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ type: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);





