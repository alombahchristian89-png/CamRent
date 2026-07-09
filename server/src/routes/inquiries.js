const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { protect, authorize, isVerifiedLandlord } = require('../middleware/auth');
const inquiryController = require('../controllers/inquiryController');

// Validation rules
const sendInquiryValidation = [
  body('propertyId')
    .notEmpty()
    .withMessage('Property ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid Property ID'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters')
];

const respondInquiryValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Response message is required')
    .isLength({ max: 500 })
    .withMessage('Response cannot exceed 500 characters')
];

const conversationMessageValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 1000 })
    .withMessage('Message cannot exceed 1000 characters')
];

// Routes
router.post('/', protect, authorize('tenant'), sendInquiryValidation, inquiryController.sendInquiry);
router.get('/tenant', protect, authorize('tenant'), inquiryController.getTenantInquiries);
router.get('/tenant/stats', protect, authorize('tenant'), inquiryController.getTenantStats);
router.get('/landlord', protect, authorize('landlord'), isVerifiedLandlord, inquiryController.getLandlordInquiries);
router.post('/:id/messages', protect, conversationMessageValidation, inquiryController.sendInquiryMessage);
router.post('/:id/read', protect, inquiryController.markInquiryAsRead);
router.put('/:id/respond', protect, authorize('landlord'), isVerifiedLandlord, respondInquiryValidation, inquiryController.respondToInquiry);
router.put('/:id/close', protect, inquiryController.closeInquiry);

module.exports = router;
