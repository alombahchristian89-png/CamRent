const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Property title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Property description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  location: {
    city: {
      type: String,
      required: [true, 'City is required'],
      enum: ['Douala', 'Yaoundé', 'Bamenda', 'Bafoussam', 'Garoua', 'Maroua', 'Ngaoundéré', 'Bertoua', 'Edea', 'Kribi', 'Limbe', 'Other']
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      maxlength: [200, 'Address cannot exceed 200 characters']
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  images: [{
    type: String,
    required: true
  }],
  amenities: [{
    type: String,
    enum: [
      'Parking', 'Security', 'Water', 'Electricity', 'Air Conditioning', 
      'Furnished', 'Balcony', 'Garden', 'Swimming Pool', 'Gym', 
      'WiFi', 'Kitchen', 'Bathroom', 'Bedroom', 'Living Room'
    ]
  }],
  propertyType: {
    type: String,
    required: [true, 'Property type is required'],
    enum: [
      'studio',
      'apartment',
      'house',
      'villa',
      'office',
      'shop',
      'warehouse',
      'hotel',
      'guest-house',
      'lodge',
      'resort',
      'serviced-apartment',
      'airbnb-unit',
      'holiday-home',
      'commercial'
    ]
  },
  propertyCategory: {
    type: String,
    enum: ['residential', 'commercial', 'hospitality'],
    default: 'residential'
  },
  rentalType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    default: 'monthly'
  },
  pricing: {
    daily: { type: Number, min: 0, default: 0 },
    weekly: { type: Number, min: 0, default: 0 },
    monthly: { type: Number, min: 0, default: 0 },
    yearly: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: 'XAF' }
  },
  hospitalityInfo: {
    checkInTime: String,
    checkOutTime: String,
    roomsAvailable: { type: Number, min: 0, default: 0 },
    maxOccupancy: { type: Number, min: 1, default: 1 }
  },
  residentialInfo: {
    leaseDurationMonths: { type: Number, min: 1, default: 12 },
    securityDeposit: { type: Number, min: 0, default: 0 }
  },
  bedrooms: {
    type: Number,
    required: [true, 'Number of bedrooms is required'],
    min: [0, 'Bedrooms cannot be negative'],
    max: [20, 'Bedrooms cannot exceed 20']
  },
  bathrooms: {
    type: Number,
    required: [true, 'Number of bathrooms is required'],
    min: [0, 'Bathrooms cannot be negative'],
    max: [20, 'Bathrooms cannot exceed 20']
  },
  area: {
    type: Number,
    required: [true, 'Area is required'],
    min: [1, 'Area must be at least 1 sq meter']
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  inquiries: {
    type: Number,
    default: 0
  },
  availableFrom: {
    type: Date,
    required: [true, 'Available date is required']
  },
  contactInfo: {
    phone: String,
    email: String,
    whatsapp: String
  }
}, {
  timestamps: true
});

// Index for search functionality
propertySchema.index({ 'location.city': 1, price: 1, propertyType: 1 });
propertySchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Property', propertySchema);
