const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  imageUrl: {
    type: String,
  },
  serviceType: {
    type: String,
    required: true,
    enum: ['delivery', 'taxi', 'maintenance', 'all'],
  },
  supermarketId: {
    type: String,
  },
  hasDiscount: {
    type: Boolean,
    default: false,
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

advertisementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

advertisementSchema.index({ isActive: 1, serviceType: 1 });
advertisementSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Advertisement', advertisementSchema);







