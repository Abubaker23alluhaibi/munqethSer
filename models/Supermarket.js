const mongoose = require('mongoose');

const supermarketSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
  },
  phone: {
    type: String,
  },
  email: {
    type: String,
  },
  image: {
    type: String,
  },
  latitude: {
    type: Number,
  },
  longitude: {
    type: Number,
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

supermarketSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

supermarketSchema.index({ latitude: 1, longitude: 1 });

module.exports = mongoose.model('Supermarket', supermarketSchema);







