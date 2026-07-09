const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  landlordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'responded', 'closed'],
    default: 'pending'
  },
  tenantContact: {
    name: String,
    email: String,
    phone: String
  },
  landlordResponse: {
    message: String,
    respondedAt: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
inquirySchema.index({ tenantId: 1, createdAt: -1 });
inquirySchema.index({ landlordId: 1, createdAt: -1 });
inquirySchema.index({ propertyId: 1 });

module.exports = mongoose.model('Inquiry', inquirySchema);
