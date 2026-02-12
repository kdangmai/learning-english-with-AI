const express = require('express');
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');
const router = express.Router();

router.use(auth);

// GET /api/users/profile - Get user profile
router.get('/profile', userController.getProfile);

// PUT /api/users/profile - Update user profile
router.put('/profile', userController.updateProfile);

// GET /api/users/statistics - Get learning statistics
router.get('/statistics', userController.getStatistics);

// PUT /api/users/preferences - Update learning preferences
router.put('/preferences', userController.updatePreferences);

module.exports = router;
