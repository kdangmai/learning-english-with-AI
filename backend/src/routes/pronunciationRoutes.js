const express = require('express');
const router = express.Router();
const pronunciationController = require('../controllers/pronunciationController');
const protect = require('../middleware/auth');

/**
 * @route POST /api/pronunciation/analyze
 * @desc Analyze pronunciation accuracy
 * @access Private
 */
router.post('/analyze', protect, pronunciationController.analyzePronunciation);

/**
 * @route GET /api/pronunciation/generate
 * @desc Generate practice sentence
 * @access Private
 */
router.get('/generate', protect, pronunciationController.generateSentence);

module.exports = router;
