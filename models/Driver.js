const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  driverId: {
    type: String,
    required: true,
    unique: true, // unique يضيف index تلقائياً
    uppercase: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    // لا نضع unique: true لأن الكود يمكن أن يتكرر (هو رمز الدخول)
  },
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  serviceType: {
    type: String,
    required: true,
    enum: ['delivery', 'taxi', 'maintenance', 'car_emergency', 'crane', 'fuel', 'maid', 'car_wash'],
  },
  vehicleType: {
    type: String,
  },
  vehicleNumber: {
    type: String,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  currentLatitude: {
    type: Number,
  },
  currentLongitude: {
    type: Number,
  },
  image: {
    type: String,
  },
  fcmToken: {
    type: [String],
    default: [],
  },
  lastLocationUpdate: {
    type: Date,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
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

driverSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

driverSchema.index({ serviceType: 1, isAvailable: 1 });
driverSchema.index({ currentLatitude: 1, currentLongitude: 1 });
// driverId لديه unique: true مما يضيف index تلقائياً، لا حاجة لإعادة تعريفه هنا

module.exports = mongoose.model('Driver', driverSchema);


