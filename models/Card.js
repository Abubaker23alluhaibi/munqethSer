const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    enum: [5000, 10000, 25000],
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  usedBy: {
    type: String,
  },
  usedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for isUsed field (code already has index: true and unique: true)
cardSchema.index({ isUsed: 1 });

module.exports = mongoose.model('Card', cardSchema);


