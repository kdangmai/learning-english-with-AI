const Sentence = require('../models/Sentence');
const ChatbotService = require('../services/chatbotService');
const GrammarCheckService = require('../services/grammarCheckService');

/**
 * Submit sentence translation
 */
exports.submitSentence = async (req, res) => {
  try {
    const { vietnameseSentence, userAnswer, difficulty } = req.body;
    const userId = req.userId;

    if (!vietnameseSentence || !userAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Vietnamese sentence and user answer are required'
      });
    }

    // Get translation reference from AI
    let aiReference = '';
    try {
      aiReference = await ChatbotService.translateVietnamseToEnglish(vietnameseSentence, userId);
    } catch (error) {
      console.error('Translation error:', error);
      aiReference = 'Translation service unavailable';
    }

    // Get hints if medium or hard difficulty
    let hints = {};
    // eslint-disable-next-line no-constant-condition
    if (true) {
      try {
        hints = await ChatbotService.getSentenceHints(vietnameseSentence, difficulty, userId);
      } catch (error) {
        console.error('Hints error:', error);
        hints = { vocabularyHints: [], grammarStructures: [] };
      }
    }

    // Score the sentence using AI for better semantic evaluation
    let feedback = {
      score: 0,
      grammarScore: 0,
      vocabularyScore: 0,
      grammarErrors: [],
      suggestions: []
    };

    try {
      // Pass grammarDifficulty to evaluation
      const evaluation = await ChatbotService.evaluateTranslation(vietnameseSentence, userAnswer, req.body.grammarDifficulty || difficulty, userId);

      feedback = {
        score: evaluation.score,
        grammarScore: evaluation.score,
        vocabularyScore: evaluation.score,
        grammarErrors: evaluation.corrections || [],
        suggestions: []
      };

      if (evaluation.feedback) {
        feedback.suggestions.push(evaluation.feedback);
      }
      if (evaluation.betterVersion) {
        feedback.suggestions.push(`Better version: ${evaluation.betterVersion}`);
      }

    } catch (error) {
      console.error('Scoring error:', error);
      feedback.score = 50;
      feedback.suggestions.push('Could not evaluate translation at this time.');
    }

    // Save to database
    const sentence = new Sentence({
      userId,
      vietnameseSentence,
      userAnswer,
      aiReference,
      difficulty,
      feedback,
      hints,
      status: 'graded',
      gradedAt: new Date()
    });

    // Increment Stat: sentencesPracticed
    await require('../models/User').updateOne({ _id: userId }, { $inc: { 'stats.sentencesPracticed': 1 } });

    await sentence.save();

    res.json({
      success: true,
      message: 'Sentence submitted and graded successfully',
      sentenceId: sentence._id,
      feedback: sentence.feedback,
      hints: sentence.hints,
      aiReference: sentence.aiReference
    });
  } catch (error) {
    console.error('Submit sentence error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Grade sentence (AI powered)
 */
exports.gradeSentence = async (req, res) => {
  try {
    const { userAnswer, referenceAnswer } = req.body;

    if (!userAnswer) {
      return res.status(400).json({
        success: false,
        message: 'User answer is required'
      });
    }

    // Check grammar
    const grammarCheck = await GrammarCheckService.checkGrammar(userAnswer);
    const scoring = await GrammarCheckService.scoreSentence(
      userAnswer,
      referenceAnswer || ''
    );

    res.json({
      success: true,
      feedback: {
        score: scoring.overallScore,
        grammarScore: scoring.grammarScore,
        vocabularyScore: scoring.vocabularyScore,
        errors: grammarCheck.errors,
        suggestions: scoring.suggestions
      }
    });
  } catch (error) {
    console.error('Grade sentence error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Upgrade sentence to C1 level
 */
exports.upgradeSentence = async (req, res) => {
  try {
    const { userAnswer, grammarLevel, vocabularyLevel } = req.body;

    if (!userAnswer) {
      return res.status(400).json({
        success: false,
        message: 'User answer is required'
      });
    }

    // Upgrade using ChatbotService
    const upgraded = await ChatbotService.upgradeSentence(
      userAnswer,
      grammarLevel || 'C1',
      vocabularyLevel || 'C1',
      req.userId
    );

    res.json({
      success: true,
      upgradedSentence: upgraded.upgradedSentence,
      improvements: upgraded.improvements
    });
  } catch (error) {
    console.error('Upgrade sentence error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get sentence history
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 20, skip = 0 } = req.query;

    const sentences = await Sentence.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Sentence.countDocuments({ userId });

    res.json({
      success: true,
      sentences,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get specific sentence
 */
exports.getSentence = async (req, res) => {
  try {
    const { sentenceId } = req.params;
    const userId = req.userId;

    const sentence = await Sentence.findOne({ _id: sentenceId, userId });
    if (!sentence) {
      return res.status(404).json({
        success: false,
        message: 'Sentence not found'
      });
    }

    res.json({
      success: true,
      sentence
    });
  } catch (error) {
    console.error('Get sentence error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get hints for sentence
 */
exports.getHints = async (req, res) => {
  try {
    const { vietnameseSentence, difficulty } = req.body;

    if (!vietnameseSentence || !difficulty) {
      return res.status(400).json({
        success: false,
        message: 'Vietnamese sentence and difficulty are required'
      });
    }

    const hints = await ChatbotService.getSentenceHints(
      vietnameseSentence,
      difficulty,
      req.userId
    );

    res.json({
      success: true,
      hints
    });
  } catch (error) {
    console.error('Get hints error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Generate random Vietnamese sentence using Gemini API
 */
exports.generateRandomSentence = async (req, res) => {
  try {
    const { difficulty = 'easy' } = req.body;
    const userId = req.userId;

    // Validate difficulty level
    const validLevels = ['easy', 'medium', 'hard', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    if (!validLevels.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid difficulty level'
      });
    }

    // Generate sentence prompt based on difficulty
    let prompt = '';
    const levels = {
      'A1': 'người mới bắt đầu học tiếng Anh (trình độ A1). Câu nên sử dụng từ vựng cơ bản và ngữ pháp đơn giản.',
      'A2': 'người học tiếng Anh trình độ A2. Câu nên sử dụng từ vựng và ngữ pháp cơ bản mở rộng.',
      'B1': 'người học tiếng Anh trình độ B1. Câu nên sử dụng từ vựng và ngữ pháp trung cấp.',
      'B2': 'người học tiếng Anh trình độ B2. Câu nên sử dụng từ vựng phong phú và ngữ pháp phức tạp hơn.',
      'C1': 'người học tiếng Anh trình độ C1. Câu nên sử dụng từ vựng cao cấp, cấu trúc câu phức tạp và mang tính học thuật hoặc chuyên sâu.',
      'C2': 'người thành thạo tiếng Anh (trình độ C2). Câu nên sử dụng từ vựng rất phong phú, sắc thái tinh tế, thành ngữ và cấu trúc phức tạp.'
    };

    // Map old difficulty to new levels for backward compatibility
    let levelDescription = levels['A1']; // Default
    if (levels[difficulty]) {
      levelDescription = levels[difficulty];
    } else if (difficulty === 'easy') {
      levelDescription = levels['A1'];
    } else if (difficulty === 'medium') {
      levelDescription = levels['B1'];
    } else if (difficulty === 'hard') {
      levelDescription = levels['C1'];
    }

    prompt = `Hãy tạo 1 câu tiếng Việt`;
    if (req.body.topic) {
      prompt += ` về chủ đề "${req.body.topic}"`;
    }
    prompt += ` phù hợp cho ${levelDescription} Chỉ trả lời duy nhất câu tiếng Việt đó, không giải thích gì thêm, không có dấu ngoặc kép.`;

    // Call Gemini API to generate sentence
    const vietnameseSentence = await ChatbotService.sendToChatbot(prompt, '', null, null, userId, 'random_sentence');

    res.json({
      success: true,
      message: 'Random sentence generated successfully',
      vietnameseSentence: vietnameseSentence.trim(),
      difficulty
    });
  } catch (error) {
    console.error('Generate random sentence error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate random sentence'
    });
  }
};

