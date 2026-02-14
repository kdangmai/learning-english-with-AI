const express = require('express');
const auth = require('../middleware/auth');
const vocabularyController = require('../controllers/vocabularyController');
const router = express.Router();

router.use(auth);

// === STATIC ROUTES FIRST (before :wordId wildcard) ===

// GET /api/vocabulary/topics - Get vocabulary topics
router.get('/topics', vocabularyController.getTopics);

// GET /api/vocabulary/srs-stats - Get SRS statistics
router.get('/srs-stats', vocabularyController.getSrsStats);

// GET /api/vocabulary/flashcards - Get flashcards for review
router.get('/flashcards', vocabularyController.getFlashcards);

// GET /api/vocabulary/by-topic/:topic - Get words by topic
router.get('/by-topic/:topic', vocabularyController.getWordsByTopic);

// GET /api/vocabulary/by-status/:status - Get words by mastery status
router.get('/by-status/:status', vocabularyController.getWordsByStatus);

// POST /api/vocabulary/add - Add new vocabulary word
router.post('/add', vocabularyController.addWord);

// POST /api/vocabulary/start-learning - Start learning topic with AI-generated words
router.post('/start-learning', vocabularyController.startLearning);

// POST /api/vocabulary/review - Update word review/mastery
router.post('/review', vocabularyController.reviewWord);

// POST /api/vocabulary/srs-review - Anki-SRS Review
router.post('/srs-review', vocabularyController.srsReview);

// POST /api/vocabulary/generate-flashcards - Generate AI flashcards
router.post('/generate-flashcards', vocabularyController.generateFlashcards);

// POST /api/vocabulary/bulk-delete - Bulk delete words (single operation)
router.post('/bulk-delete', vocabularyController.bulkDeleteWords);

// GET /api/vocabulary/match-game - Get words for match game
router.get('/match-game', vocabularyController.getMatchGameWords);

// GET /api/vocabulary/intervals/:wordId - Get SRS intervals for a word
router.get('/intervals/:wordId', vocabularyController.getWordIntervals);

// === WILDCARD ROUTES LAST ===

// PUT /api/vocabulary/:wordId - Update vocabulary word
router.put('/:wordId', vocabularyController.updateWord);

// POST /api/vocabulary/:wordId/action - Apply action from flashcard
router.post('/:wordId/action', vocabularyController.updateWordAction);

// DELETE /api/vocabulary/:wordId - Delete a vocabulary word
router.delete('/:wordId', vocabularyController.deleteWord);

module.exports = router;
