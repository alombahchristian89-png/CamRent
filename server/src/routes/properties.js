const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { protect, authorize, isVerifiedLandlord } = require('../middleware/auth');
const propertyController = require('../controllers/propertyController');

const validPropertyTypes = [
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
];

const validRentalTypes = ['daily', 'weekly', 'monthly', 'yearly'];
const validPropertyCategories = ['residential', 'commercial', 'hospitality'];

// Validation rules
const createPropertyValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('price')
    .isNumeric()
    .withMessage('Price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Price must be positive'),
  body('location.city')
    .isIn(['Douala', 'Yaoundé', 'Bamenda', 'Bafoussam', 'Garoua', 'Maroua', 'Ngaoundéré', 'Bertoua', 'Edea', 'Kribi', 'Limbe', 'Other'])
    .withMessage('Invalid city'),
  body('location.address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('propertyType')
    .isIn(validPropertyTypes)
    .withMessage('Invalid property type'),
  body('rentalType')
    .isIn(validRentalTypes)
    .withMessage('Invalid rental type'),
  body('propertyCategory')
    .optional()
    .isIn(validPropertyCategories)
    .withMessage('Invalid property category'),
  body('bedrooms')
    .isInt({ min: 0, max: 20 })
    .withMessage('Bedrooms must be between 0 and 20'),
  body('bathrooms')
    .isInt({ min: 0, max: 20 })
    .withMessage('Bathrooms must be between 0 and 20'),
  body('area')
    .isFloat({ min: 1 })
    .withMessage('Area must be at least 1 square meter'),
  body('availableFrom')
    .isISO8601()
    .withMessage('Available date must be a valid date'),
  body('images')
    .isArray({ min: 1 })
    .withMessage('At least one image is required'),
  body('videos')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Videos must be an array with up to 5 items'),
  body('videos.*')
    .optional()
    .isURL()
    .withMessage('Each video must be a valid URL'),
  body('pricing')
    .optional()
    .isObject()
    .withMessage('Pricing must be a valid object'),
  body('hospitalityInfo')
    .optional()
    .isObject()
    .withMessage('Hospitality info must be a valid object'),
  body('residentialInfo')
    .optional()
    .isObject()
    .withMessage('Residential info must be a valid object'),
  body('listingStatus')
    .optional()
    .isIn(['available', 'taken'])
    .withMessage('Listing status must be available or taken')
];

const updatePropertyValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty')
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('price')
    .optional()
    .isNumeric()
    .withMessage('Price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Price must be positive'),
  body('location.city')
    .optional()
    .isIn(['Douala', 'Yaoundé', 'Bamenda', 'Bafoussam', 'Garoua', 'Maroua', 'Ngaoundéré', 'Bertoua', 'Edea', 'Kribi', 'Limbe', 'Other'])
    .withMessage('Invalid city'),
  body('location.address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address cannot be empty'),
  body('propertyType')
    .optional()
    .isIn(validPropertyTypes)
    .withMessage('Invalid property type'),
  body('rentalType')
    .optional()
    .isIn(validRentalTypes)
    .withMessage('Invalid rental type'),
  body('propertyCategory')
    .optional()
    .isIn(validPropertyCategories)
    .withMessage('Invalid property category'),
  body('bedrooms')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Bedrooms must be between 0 and 20'),
  body('bathrooms')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Bathrooms must be between 0 and 20'),
  body('area')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Area must be at least 1 square meter'),
  body('availableFrom')
    .optional()
    .isISO8601()
    .withMessage('Available date must be a valid date'),
  body('images')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one image is required'),
  body('videos')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Videos must be an array with up to 5 items'),
  body('videos.*')
    .optional()
    .isURL()
    .withMessage('Each video must be a valid URL'),
  body('pricing')
    .optional()
    .isObject()
    .withMessage('Pricing must be a valid object'),
  body('hospitalityInfo')
    .optional()
    .isObject()
    .withMessage('Hospitality info must be a valid object'),
  body('residentialInfo')
    .optional()
    .isObject()
    .withMessage('Residential info must be a valid object'),
  body('listingStatus')
    .optional()
    .isIn(['available', 'taken'])
    .withMessage('Listing status must be available or taken')
];

// Public routes
router.get('/', propertyController.getProperties);
router.get('/:id', propertyController.getPropertyById);

// Protected routes
router.post('/', protect, authorize('landlord'), isVerifiedLandlord, createPropertyValidation, propertyController.createProperty);
router.put('/:id', protect, authorize('landlord', 'admin'), isVerifiedLandlord, updatePropertyValidation, propertyController.updateProperty);
router.delete('/:id', protect, authorize('landlord'), isVerifiedLandlord, propertyController.deleteProperty);
router.get('/landlord/my-properties', protect, authorize('landlord'), isVerifiedLandlord, propertyController.getLandlordProperties);

module.exports = router;
