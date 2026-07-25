const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { protect, authorize, requireSuperAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// Validation rules
const verifyLandlordValidation = [
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be approved or rejected'),
  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Rejection reason cannot exceed 500 characters')
];

const banUserValidation = [
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const updateUserRoleValidation = [
  body('role')
    .isIn(['tenant', 'landlord'])
    .withMessage('Role must be tenant or landlord')
];

const updateUserValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Please provide a valid phone number')
    .bail()
    .isLength({ max: 30 })
    .withMessage('Phone cannot exceed 30 characters')
];

const updateUserPasswordValidation = [
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage('Password must contain uppercase, lowercase, and a number')
];

const createAdminValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Please provide a valid phone number')
    .bail()
    .isLength({ max: 30 })
    .withMessage('Phone cannot exceed 30 characters'),
  body('language')
    .optional()
    .isIn(['en', 'fr'])
    .withMessage('Language must be either en or fr')
];

// Routes
router.get('/dashboard', protect, authorize('admin', 'super_admin'), adminController.getDashboard);
router.get('/reports/properties', protect, authorize('admin', 'super_admin'), adminController.getPropertyAnalytics);
router.get('/landlords', protect, authorize('admin', 'super_admin'), adminController.getLandlords);
router.put('/verify/:id', protect, authorize('admin', 'super_admin'), verifyLandlordValidation, adminController.verifyLandlord);
router.get('/users', protect, authorize('admin', 'super_admin'), adminController.getUsers);
router.get('/users/:id', protect, authorize('admin', 'super_admin'), adminController.getUser);
router.put('/users/:id', protect, authorize('admin', 'super_admin'), updateUserValidation, adminController.updateUser);
router.put('/users/:id/password', protect, authorize('admin', 'super_admin'), updateUserPasswordValidation, adminController.updateUserPassword);
router.put('/users/:id/ban', protect, authorize('admin', 'super_admin'), banUserValidation, adminController.banUser);
router.put('/users/:id/role', protect, authorize('admin', 'super_admin'), updateUserRoleValidation, adminController.updateUserRole);
router.post('/admins', protect, requireSuperAdmin, createAdminValidation, adminController.createAdminUser);
router.get('/admins', protect, authorize('admin', 'super_admin'), adminController.getAdmins);
router.post('/users/:id/reset-password', protect, authorize('admin', 'super_admin'), adminController.resetUserPassword);
router.delete('/users/:id', protect, authorize('admin', 'super_admin'), adminController.deleteUser);
router.get('/inquiries', protect, authorize('admin', 'super_admin'), adminController.getInquiries);
router.get('/inquiries/:id/decrypt', protect, authorize('admin', 'super_admin'), adminController.decryptInquiryConversation);
router.get('/notifications', protect, authorize('admin', 'super_admin'), adminController.getNotifications);
router.get('/audit-logs', protect, authorize('admin', 'super_admin'), adminController.getAuditLogs);
router.get('/properties', protect, authorize('admin', 'super_admin'), adminController.getProperties);
router.delete('/properties/:id', protect, authorize('admin', 'super_admin'), adminController.deleteProperty);

module.exports = router;
