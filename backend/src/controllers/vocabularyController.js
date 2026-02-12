const Vocabulary = require('../models/Vocabulary');
const ChatbotService = require('../services/chatbotService');

/**
 * Get vocabulary topics
 */
exports.getTopics = async (req, res) => {
  try {
    const topics = ['food', 'travel', 'business', 'technology', 'daily', 'academic', 'custom'];
    res.json({
      success: true,
      topics
    });
  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Perform action on a vocabulary word from flashcard (learned / add / skip)
 */
exports.updateWordAction = async (req, res) => {
  try {
    const { wordId } = req.params;
    const { action } = req.body;
    const userId = req.userId;

    if (!wordId || !action) {
      return res.status(400).json({ success: false, message: 'wordId and action required' });
    }

    const word = await Vocabulary.findOne({ _id: wordId, userId });
    if (!word) {
      return res.status(404).json({ success: false, message: 'Word not found' });
    }

    // "Đã học" -> Folder "Đã học"
    if (action === 'learned') {
      word.mastery.status = 'known';
      word.isNewWord = false; // Move out of "New" folder
    }
    // "Từ mới" -> Folder "Từ mới" (Keep it there or move there)
    else if (action === 'add') { // Mapped from frontend "add" button which corresponds to "Từ mới"
      word.isNewWord = true;
      word.mastery.status = 'learning'; // Or 'unknown'
    }
    // "Bỏ qua" -> Just remove from "New" folder? Or keep in "All" but not specific?
    // User: "Bỏ qua". Context: Flashcard has 3 buttons.
    // If user skips, they might not want to learn it now.
    // Let's set isNewWord = false, status = 'unknown'. It remains in "All", but not in "New" or "Learned".
    else if (action === 'skip') {
      word.isNewWord = false;
      word.mastery.status = 'unknown';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await word.save();

    res.json({ success: true, message: 'Action applied', word });
  } catch (error) {
    console.error('Update word action error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get words by topic
 */
exports.getWordsByTopic = async (req, res) => {
  try {
    const { topic } = req.params;
    const userId = req.userId;

    const words = await Vocabulary.find({ userId, topic });

    res.json({
      success: true,
      topic,
      words,
      count: words.length
    });
  } catch (error) {
    console.error('Get words by topic error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get words by mastery status
 */
exports.getWordsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const userId = req.userId;

    let query = { userId };
    if (status === 'all') {
      // No extra filter
    } else if (status === 'new') {
      query.isNewWord = true;
    } else {
      query['mastery.status'] = status;
    }

    const words = await Vocabulary.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      status,
      words,
      count: words.length
    });
  } catch (error) {
    console.error('Get words by status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Add new vocabulary word
 */
exports.addWord = async (req, res) => {
  try {
    const { word, meaning, example, topic, level, partOfSpeech } = req.body;
    const userId = req.userId;

    if (!word || !meaning) {
      return res.status(400).json({
        success: false,
        message: 'Word and meaning are required'
      });
    }

    const newWord = new Vocabulary({
      userId,
      word: word.toLowerCase().trim(),
      meaning,
      example,
      topic: topic || 'custom',
      level: level || 'A1',
      partOfSpeech,
      mastery: {
        status: 'unknown',
        nextReviewAt: new Date()
      }
    });

    await newWord.save();

    res.status(201).json({
      success: true,
      message: 'Word added successfully',
      word: newWord
    });
  } catch (error) {
    console.error('Add word error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update vocabulary word
 */
exports.updateWord = async (req, res) => {
  try {
    const { wordId } = req.params;
    const userId = req.userId;
    const updates = req.body;

    const word = await Vocabulary.findOneAndUpdate(
      { _id: wordId, userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!word) {
      return res.status(404).json({
        success: false,
        message: 'Word not found'
      });
    }

    res.json({
      success: true,
      message: 'Word updated successfully',
      word
    });
  } catch (error) {
    console.error('Update word error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Review word and update mastery
 */
exports.reviewWord = async (req, res) => {
  try {
    const { wordId, correct } = req.body;
    const userId = req.userId;

    if (wordId === undefined || correct === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Word ID and correct status are required'
      });
    }

    const word = await Vocabulary.findOne({ _id: wordId, userId });
    if (!word) {
      return res.status(404).json({
        success: false,
        message: 'Word not found'
      });
    }

    if (correct) {
      word.mastery.correctCount += 1;

      // Spaced repetition intervals
      const intervals = {
        unknown: 1,
        learning: 3,
        known: 7,
        mastered: 30
      };

      // Upgrade status
      const statuses = ['unknown', 'learning', 'known', 'mastered'];
      const currentIdx = statuses.indexOf(word.mastery.status);

      if (currentIdx < 3) {
        word.mastery.status = statuses[currentIdx + 1];
      }

      const nextInterval = intervals[word.mastery.status] || 30;
      word.mastery.nextReviewAt = new Date(
        Date.now() + nextInterval * 24 * 60 * 60 * 1000
      );
    } else {
      word.mastery.incorrectCount += 1;
      // Reset to learning
      word.mastery.status = 'learning';
      word.mastery.nextReviewAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
    }

    word.mastery.lastReviewedAt = new Date();

    await word.save();

    res.json({
      success: true,
      message: 'Word review updated',
      word
    });
  } catch (error) {
    console.error('Review word error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/**
 * Calculate next SRS intervals for display on buttons
 */
function calculateNextIntervals(word) {
  const srs = word.srs || { step: 0, interval: 0, easeFactor: 2.5 };
  let { step, interval, easeFactor } = srs;

  // Calculate what each button would produce
  let hardInterval, mediumInterval, easyInterval;

  // Hard
  hardInterval = step === 0 ? 1 : Math.max(1, Math.round(interval * 0.5));

  // Medium
  if (step === 0) {
    mediumInterval = 1;
  } else if (step === 1) {
    mediumInterval = 3;
  } else {
    mediumInterval = Math.round(Math.max(1, interval * easeFactor));
  }

  // Easy
  if (step === 0) {
    easyInterval = 4;
  } else {
    easyInterval = Math.round(Math.max(1, (interval || 1) * easeFactor * 1.3));
  }

  return {
    hard: formatInterval(hardInterval),
    medium: formatInterval(mediumInterval),
    easy: formatInterval(easyInterval)
  };
}

function formatInterval(days) {
  if (days < 1) return '< 1 ngày';
  if (days === 1) return '1 ngày';
  if (days < 7) return `${days} ngày`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks} tuần`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} tháng`;
  }
  const years = Math.round(days / 365 * 10) / 10;
  return `${years} năm`;
}

/**
 * SRS Review Word (SM-2/Anki Algorithm)
 */
exports.srsReview = async (req, res) => {
  try {
    const { wordId, rating } = req.body; // rating: 'hard', 'medium', 'easy'
    const userId = req.userId;

    const word = await Vocabulary.findOne({ _id: wordId, userId });
    if (!word) return res.status(404).json({ success: false, message: 'Word not found' });

    // Initialize SRS if missing
    if (!word.srs) {
      word.srs = { step: 0, interval: 0, easeFactor: 2.5, dueDate: new Date(), lastReviewed: null };
    }

    let { step, interval, easeFactor } = word.srs;

    if (rating === 'hard') {
      // Hard: Reduce interval, decrease ease factor
      if (step === 0) {
        interval = 1; // Review again tomorrow
      } else {
        interval = Math.max(1, Math.round(interval * 0.5)); // Halve the interval
      }
      step = Math.max(0, step); // Don't reset step completely
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      word.mastery.status = 'learning';
      word.mastery.incorrectCount = (word.mastery.incorrectCount || 0) + 1;
    } else if (rating === 'medium') {
      // Medium/Good: Normal progression
      if (step === 0) {
        step = 1;
        interval = 1; // 1 day
      } else if (step === 1) {
        step = 2;
        interval = 3; // 3 days
      } else {
        // Graduated review: multiply by ease factor
        if (interval < 1) interval = 1;
        interval = Math.round(interval * easeFactor);
        step += 1;
      }
      word.mastery.correctCount = (word.mastery.correctCount || 0) + 1;

      // Update mastery status based on step
      if (step >= 4) {
        word.mastery.status = 'mastered';
      } else if (step >= 2) {
        word.mastery.status = 'known';
      } else {
        word.mastery.status = 'learning';
      }
    } else if (rating === 'easy') {
      // Easy: Fast progression with bonus
      if (step === 0) {
        step = 2;
        interval = 4; // Jump to 4 days
      } else {
        if (interval < 1) interval = 1;
        interval = Math.round(interval * easeFactor * 1.3);
        easeFactor = Math.min(3.0, easeFactor + 0.15);
        step += 2;
      }
      word.mastery.correctCount = (word.mastery.correctCount || 0) + 1;

      if (step >= 4) {
        word.mastery.status = 'mastered';
      } else {
        word.mastery.status = 'known';
      }
    }

    // Cap interval at 365 days (1 year) for practical purposes
    if (interval > 365) interval = 365;

    // Update SRS fields
    word.srs.step = step;
    word.srs.interval = interval;
    word.srs.easeFactor = easeFactor;
    word.srs.lastReviewed = new Date();
    word.srs.dueDate = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

    // Sync legacy mastery fields
    word.mastery.lastReviewedAt = word.srs.lastReviewed;
    word.mastery.nextReviewAt = word.srs.dueDate;

    // Remove "New" flag on successful review
    if (word.isNewWord && rating !== 'hard') {
      word.isNewWord = false;
    }

    await word.save();

    // Calculate next intervals for the response (for UI display on next card)
    const nextIntervals = calculateNextIntervals(word);

    res.json({
      success: true,
      message: 'Review recorded',
      nextReview: word.srs.dueDate,
      srs: word.srs,
      mastery: word.mastery,
      nextIntervals
    });
  } catch (error) {
    console.error('SRS Review error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get flashcards for review (SRS Optimized)
 */
exports.getFlashcards = async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 20 } = req.query;
    const now = new Date();
    const parsedLimit = parseInt(limit);

    // 1. Fetch Due Reviews First (words that need SRS review)
    const dueReviews = await Vocabulary.find({
      userId,
      $or: [
        { 'srs.dueDate': { $lte: now } },
        { 'mastery.nextReviewAt': { $lte: now } }
      ],
      'mastery.status': { $in: ['learning', 'known'] } // Only words that have started learning
    }).sort({ 'srs.dueDate': 1 }).limit(parsedLimit);

    const dueIds = new Set(dueReviews.map(w => w._id.toString()));
    let flashcards = [...dueReviews];

    // 2. If space remains, fill with New Words (not already included)
    if (flashcards.length < parsedLimit) {
      const remaining = parsedLimit - flashcards.length;
      const newWords = await Vocabulary.find({
        userId,
        _id: { $nin: Array.from(dueIds) }, // Prevent duplicates
        $or: [{ isNewWord: true }, { 'mastery.status': 'unknown' }]
      }).sort({ createdAt: -1 }).limit(remaining);

      flashcards = [...flashcards, ...newWords];
    }

    // Calculate next SRS intervals for each flashcard (for button labels)
    const flashcardsWithIntervals = flashcards.map(card => {
      const cardObj = card.toObject();
      cardObj.nextIntervals = calculateNextIntervals(card);
      return cardObj;
    });

    res.json({
      success: true,
      flashcards: flashcardsWithIntervals,
      count: flashcards.length,
      dueCount: dueReviews.length
    });
  } catch (error) {
    console.error('Get flashcards error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Generate flashcards from topic
 */
exports.generateFlashcards = async (req, res) => {
  try {
    const { topic } = req.body;
    const userId = req.userId;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required'
      });
    }

    // Get words from topic
    const words = await Vocabulary.find({
      userId,
      topic,
      'mastery.status': { $in: ['unknown', 'learning'] }
    }).limit(20);

    res.json({
      success: true,
      topic,
      flashcards: words,
      count: words.length
    });
  } catch (error) {
    console.error('Generate flashcards error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Start learning - Generate vocabulary words for a topic using Gemini API
 */
exports.startLearning = async (req, res) => {
  try {
    const { topic, count = 10, category = 'Daily', partOfSpeech = 'mix', level = 'B1' } = req.body;
    const userId = req.userId;

    // Fetch existing words to prevent duplicates
    const existingWords = await Vocabulary.find({ userId }).select('word');
    const existingWordSet = new Set(existingWords.map(w => w.word.toLowerCase()));

    // Request a buffer using count (Gemini sometimes generates duplicates or simple words we filter out)
    const bufferCount = Math.max(Math.ceil(count * 1.5), 10);

    let posInstruction = '';
    if (partOfSpeech !== 'mix') {
      posInstruction = `5. Chỉ tạo các từ thuộc loại từ: "${partOfSpeech}" (quan trọng).`;
    }

    let categoryInstruction = '';
    if (category === 'IELTS') {
      categoryInstruction = 'Từ vựng phải có độ khó và tính học thuật cao (Band 6.0+), phù hợp cho IELTS.';
    } else if (category === 'Daily') {
      categoryInstruction = 'Từ vựng thông dụng trong đời sống hàng ngày.';
    }

    // Prompt for Gemini API
    const prompt = `Hãy tạo danh sách ${bufferCount} từ vựng tiếng Anh CHÍNH XÁC về chủ đề "${topic}".
    
    Yêu cầu quan trọng:
    - Trình độ CEFR mục tiêu: ${level}. (Hãy chọn từ vựng phù hợp sát với trình độ ${level}).
    - ${categoryInstruction}
    - Loại từ mong muốn: ${partOfSpeech === 'mix' ? 'Đa dạng (Danh/Động/Tính/Trạng)' : partOfSpeech}.

    Yêu cầu chung:
    1. Đa dạng hóa từ vựng.
    2. Tránh từ quá hiển nhiên nếu chủ đề nâng cao.
    3. Định dạng JSON bắt buộc (danh sách phẳng):
    [
      {
        "word": "từ tiếng anh",
        "partOfSpeech": "loại từ (noun/verb/adj...)",
        "level": "${level}",  
        "pronunciation": { "uk": "/ipa-uk/", "us": "/ipa-us/" },
        "meaning": { "vi": "nghĩa tiếng việt ngắn gọn" },
        "example": "ví dụ tiếng anh có chứa từ này"
      }
    ]
    4. Chỉ trả về JSON thuần, không markdown.
    ${posInstruction}`;

    // Call Gemini API
    const response = await ChatbotService.sendToChatbot(prompt);

    // Parse JSON response
    let vocabularyData = [];
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        vocabularyData = JSON.parse(jsonMatch[0]);
      } else {
        vocabularyData = JSON.parse(response);
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      return res.status(500).json({ success: false, message: 'Failed to parse AI response' });
    }

    // Filter duplicates and save until we reach 'count'
    const savedWords = [];
    for (const vocabItem of vocabularyData) {
      if (savedWords.length >= count) break; // Stop if we have enough

      const wordLower = vocabItem.word ? vocabItem.word.toLowerCase().trim() : '';
      if (!wordLower || existingWordSet.has(wordLower)) {
        continue; // Skip duplicate or invalid
      }

      const newWord = new Vocabulary({
        userId,
        word: wordLower,
        meaning: {
          vi: vocabItem.meaning?.vi || '',
          en: ''
        },
        pronunciation: vocabItem.pronunciation || '',
        example: vocabItem.example || '',
        topic,
        level: vocabItem.level || 'A1',
        partOfSpeech: vocabItem.partOfSpeech || 'noun',
        isNewWord: true,
        mastery: { status: 'unknown', nextReviewAt: new Date() },
        srs: { step: 0, interval: 0, easeFactor: 2.5, dueDate: new Date(), lastReviewed: null }
      });

      const saved = await newWord.save();
      existingWordSet.add(wordLower);
      savedWords.push(saved);
    }

    res.json({
      success: true,
      message: `Generated ${savedWords.length} new words.`,
      words: savedWords,
      count: savedWords.length
    });
  } catch (error) {
    console.error('Start learning error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a vocabulary word
 */
exports.deleteWord = async (req, res) => {
  try {
    const { wordId } = req.params;
    const userId = req.userId;

    const word = await Vocabulary.findOneAndDelete({ _id: wordId, userId });
    if (!word) {
      return res.status(404).json({ success: false, message: 'Word not found' });
    }

    res.json({ success: true, message: 'Word deleted successfully' });
  } catch (error) {
    console.error('Delete word error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get SRS statistics for user
 */
exports.getSrsStats = async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();

    const [total, dueCount, newCount, learningCount, knownCount, masteredCount] = await Promise.all([
      Vocabulary.countDocuments({ userId }),
      Vocabulary.countDocuments({
        userId,
        $or: [
          { 'srs.dueDate': { $lte: now } },
          { 'mastery.nextReviewAt': { $lte: now } }
        ],
        'mastery.status': { $in: ['learning', 'known'] }
      }),
      Vocabulary.countDocuments({ userId, $or: [{ isNewWord: true }, { 'mastery.status': 'unknown' }] }),
      Vocabulary.countDocuments({ userId, 'mastery.status': 'learning' }),
      Vocabulary.countDocuments({ userId, 'mastery.status': 'known' }),
      Vocabulary.countDocuments({ userId, 'mastery.status': 'mastered' })
    ]);

    res.json({
      success: true,
      stats: {
        total,
        dueCount,
        newCount,
        learningCount,
        knownCount,
        masteredCount
      }
    });
  } catch (error) {
    console.error('SRS stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

