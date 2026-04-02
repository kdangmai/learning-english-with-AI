const express = require('express');
const router = express.Router();
const readingVocabController = require('../controllers/readingVocabController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// AI Analysis
router.post('/analyze', readingVocabController.analyzeReadingVocab);

// Word Management
router.post('/save-words', readingVocabController.saveReadingWords);
router.get('/list', readingVocabController.getReadingVocabList);

// Review Management
router.get('/review/due', readingVocabController.getReviewWords);

module.exports = router;
