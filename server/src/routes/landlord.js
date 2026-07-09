const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const landlordController = require('../controllers/landlordController');

// Validation rules
const submitVerificationValidation = [
  body('documents')
    .isArray({ min: 1 })
    .withMessage('At least one document is required'),
  body('documents.*')
    .isString()
    .withMessage('Each document must be a URL string')
    .bail()
    .matches(/^https?:\/\//i)
    .withMessage('Document links must be valid HTTP(S) URLs'),
  body('phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

// Routes
router.post('/verify', protect, authorize('landlord'), submitVerificationValidation, landlordController.submitVerification);
router.get('/verification-status', protect, authorize('landlord'), landlordController.getVerificationStatus);
router.get('/dashboard', protect, authorize('landlord'), landlordController.getLandlordDashboard);

module.exports = router;
