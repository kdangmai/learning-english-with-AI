const express = require('express');
const auth = require('../middleware/auth');
const leaderboardController = require('../controllers/leaderboardController');
const router = express.Router();

router.use(auth);

// GET /api/leaderboard?type=exp
router.get('/', leaderboardController.getLeaderboard);

module.exports = router;
