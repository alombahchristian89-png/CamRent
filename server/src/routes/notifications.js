const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.get('/', protect, notificationController.getMyNotifications);
router.put('/read-all', protect, notificationController.markAllNotificationsAsRead);
router.put('/:id/read', protect, notificationController.markNotificationAsRead);
router.post('/requests', protect, authorize('tenant'), notificationController.sendTenantPropertyRequest);
router.post('/requests/respond', protect, authorize('landlord'), notificationController.respondToTenantRequest);

module.exports = router;
