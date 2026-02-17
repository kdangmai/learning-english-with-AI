const express = require('express');
const auth = require('../middleware/auth');
const chatbotController = require('../controllers/chatbotController');
const router = express.Router();

router.use(auth);

// POST /api/chatbot/message - Send message to chatbot
router.post('/message', chatbotController.sendMessage);

// POST /api/chatbot/translate - Translate text
router.post('/translate', chatbotController.translate);

// GET /api/chatbot/history - Get chat history
router.get('/history', chatbotController.getHistory);

// POST /api/chatbot/session/start - Start new chat session
router.post('/session/start', chatbotController.startSession);

// POST /api/chatbot/session/end - End chat session
router.post('/session/end', chatbotController.endSession);

// DELETE /api/chatbot/session/:sessionId - Delete chat session
router.delete('/session/:sessionId', chatbotController.deleteSession);

module.exports = router;
