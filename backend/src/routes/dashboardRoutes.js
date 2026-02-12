const express = require('express');
const auth = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');
const router = express.Router();

router.use(auth);

// GET /api/dashboard/overview - Get dashboard overview
router.get('/overview', dashboardController.getOverview);

// GET /api/dashboard/grammar-progress - Get grammar progress for charts
router.get('/grammar-progress', dashboardController.getGrammarProgress);

// GET /api/dashboard/vocabulary-stats - Get vocabulary statistics
router.get('/vocabulary-stats', dashboardController.getVocabularyStats);

// GET /api/dashboard/session-stats - Get session statistics
router.get('/session-stats', dashboardController.getSessionStats);

// GET /api/dashboard/weekly-report - Get weekly learning report
router.get('/weekly-report', dashboardController.getWeeklyReport);

// GET /api/dashboard/monthly-report - Get monthly learning report
router.get('/monthly-report', dashboardController.getMonthlyReport);

module.exports = router;
