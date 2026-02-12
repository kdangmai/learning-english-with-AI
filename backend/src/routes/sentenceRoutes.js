const express = require('express');
const auth = require('../middleware/auth');
const sentenceController = require('../controllers/sentenceController');
const router = express.Router();

router.use(auth);

// POST /api/sentences/submit - Submit sentence translation
router.post('/submit', sentenceController.submitSentence);

// POST /api/sentences/grade - Grade user sentence (AI powered)
router.post('/grade', sentenceController.gradeSentence);

// POST /api/sentences/upgrade - Upgrade sentence to higher level
router.post('/upgrade', sentenceController.upgradeSentence);

// POST /api/sentences/generate-random - Generate random Vietnamese sentence
router.post('/generate-random', sentenceController.generateRandomSentence);

// GET /api/sentences/history - Get user's sentence history
router.get('/history', sentenceController.getHistory);

// GET /api/sentences/:sentenceId - Get specific sentence
router.get('/:sentenceId', sentenceController.getSentence);

// POST /api/sentences/get-hints - Get hints for sentence
router.post('/get-hints', sentenceController.getHints);

module.exports = router;
