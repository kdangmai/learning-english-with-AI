const express = require('express');
const router = express.Router();
const roleplayController = require('../controllers/roleplayController');
const authMiddleware = require('../middleware/auth');

// Protect all routes
router.use(authMiddleware);

router.post('/start', roleplayController.startRoleplay);
router.post('/message', roleplayController.sendMessage);
router.post('/end', roleplayController.endSession);

module.exports = router;
