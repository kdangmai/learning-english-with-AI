const express = require('express');
const auth = require('../middleware/auth');
const grammarController = require('../controllers/grammarController');
const router = express.Router();

router.use(auth);

// GET /api/grammar/tenses - Get all 12 tenses
router.get('/tenses', grammarController.getTenses);

// GET /api/grammar/tenses/:tenseName - Get specific tense lesson
router.get('/tenses/:tenseName', grammarController.getTenseDetails);

// GET /api/grammar/progress - Get grammar learning progress
router.get('/progress', grammarController.getProgress);

// POST /api/grammar/exercise - Submit grammar exercise
router.post('/exercise', grammarController.submitExercise);

// POST /api/grammar/complete-tense - Mark tense as completed
router.post('/complete-tense', grammarController.completeTense);

// Emergency route to reset keys
router.get('/reset-keys', async (req, res) => {
    try {
        const ApiKey = require('../models/ApiKey');
        await ApiKey.updateMany({}, { isActive: true });
        res.json({ success: true, message: "Keys reactivated" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/grammar/generate-exercises - Generate exercises for a tense
router.post('/generate-exercises', grammarController.generateExercises);

module.exports = router;
