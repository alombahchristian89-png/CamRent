const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { protect } = require('../middleware/auth');
const favoriteController = require('../controllers/favoriteController');

// Validation rules
const addFavoriteValidation = [
  body('propertyId')
    .notEmpty()
    .withMessage('Property ID is required')
    .isMongoId()
    .withMessage('Invalid Property ID')
];

// Routes
router.post('/', protect, addFavoriteValidation, favoriteController.addFavorite);
router.delete('/:propertyId', protect, favoriteController.removeFavorite);
router.get('/', protect, favoriteController.getFavorites);
router.get('/check/:propertyId', protect, favoriteController.checkFavorite);

module.exports = router;
