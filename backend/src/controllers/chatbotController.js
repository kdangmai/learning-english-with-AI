const ChatSession = require('../models/ChatSession');
const ChatbotService = require('../services/chatbotService');

/**
 * Send message to chatbot
 */
exports.sendMessage = async (req, res) => {
  try {
    const { message, sessionId, topic, audio } = req.body;
    const userId = req.userId;

    if (!message && !audio) {
      return res.status(400).json({
        success: false,
        message: 'Message or Audio is required'
      });
    }

    // Get or create chat session
    let session;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, userId });
    }

    if (!session) {
      session = new ChatSession({
        userId,
        topic: topic || 'general',
        messages: []
      });
    }

    // Add user message
    session.messages.push({
      role: 'user',
      content: message || '(Audio Message)',
      type: audio ? 'audio' : 'text',
      timestamp: new Date()
    });

    // Get AI response
    let aiResponse = '';
    try {
      const conversationContext = session.messages
        .slice(-5)
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const model = await ChatbotService.getConfig('chatbot_model', 'gemini-1.5-pro');

      // Clean base64 data if needed
      let audioData = null;
      if (audio) {
        audioData = {
          mimeType: audio.mimeType || 'audio/webm',
          data: audio.data.replace(/^data:audio\/[a-z]+;base64,/, '')
        };
      }

      aiResponse = await ChatbotService.sendToChatbot(message || '', conversationContext, model, audioData);
    } catch (error) {
      console.error('Chatbot error:', error);
      aiResponse = 'Sorry, I encountered an error. Please try again later.';
    }

    // Add AI response
    session.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });

    // Update timestamp for sorting
    session.updatedAt = new Date();

    await session.save();

    res.json({
      success: true,
      response: aiResponse,
      sessionId: session._id,
      messages: session.messages
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get chat history
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { sessionId, limit = 50, topic, excludeTopic } = req.query;

    if (sessionId) {
      // Get specific session
      const session = await ChatSession.findOne({ _id: sessionId, userId });
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      return res.json({
        success: true,
        session,
        messages: session.messages
      });
    } else {
      // Get all sessions with filters
      let query = { userId };
      if (topic) {
        query.topic = topic;
      } else if (excludeTopic) {
        query.topic = { $ne: excludeTopic };
      }

      const sessions = await ChatSession.find(query)
        .sort({ updatedAt: -1 })
        .limit(parseInt(limit));

      res.json({
        success: true,
        sessions,
        count: sessions.length
      });
    }
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Start new chat session
 */
exports.startSession = async (req, res) => {
  try {
    const { topic } = req.body;
    const userId = req.userId;

    const session = new ChatSession({
      userId,
      topic: topic || 'general',
      messages: []
    });

    await session.save();

    res.status(201).json({
      success: true,
      message: 'Chat session started',
      sessionId: session._id,
      topic: session.topic
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * End chat session
 */
exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.userId;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Calculate session duration
    const startTime = session.createdAt;
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000); // in seconds

    session.sessionDuration = duration;

    await session.save();

    res.json({
      success: true,
      message: 'Chat session ended',
      sessionDuration: duration,
      messageCount: session.messages.length
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.body; // Use req.body to match the convention if POST, or req.params if DELETE. Let's use body for consistency or verify route.
    // Usually DELETE requests use params. But let's check routes.
    // I will use req.body or req.query/params depending on route setup. Let's assume body for now or params.
    // Better to use params for RESTful DELETE. But let's see.
    // I will read routes later. I will just define it to use req.body.sessionId just in case the frontend sends JSON body.
    // OR both.
    const idToDelete = req.params.sessionId || req.body.sessionId;

    if (!idToDelete) {
      return res.status(400).json({ success: false, message: 'Session ID required' });
    }

    const userId = req.userId;
    const result = await ChatSession.deleteOne({ _id: idToDelete, userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Session not found or unauthorized' });
    }

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
