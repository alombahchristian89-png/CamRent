const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate favorites
favoriteSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
