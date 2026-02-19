const User = require('../models/User');
const Vocabulary = require('../models/Vocabulary');
const Grammar = require('../models/Grammar');
const Sentence = require('../models/Sentence');
const ChatSession = require('../models/ChatSession');
const mongoose = require('mongoose');

/**
 * Get user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select('-password -emailVerificationToken');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const updates = req.body;

    // Don't allow password or email changes here
    delete updates.password;
    delete updates.email;
    delete updates.isEmailVerified;

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true
    }).select('-password -emailVerificationToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get user learning statistics
 */
exports.getStatistics = async (req, res) => {
  try {
    const userId = req.userId;
    const ObjectId = mongoose.Types.ObjectId;

    // Vocabulary stats
    const vocabStats = await Vocabulary.aggregate([
      { $match: { userId: new ObjectId(userId) } },
      {
        $group: {
          _id: '$mastery.status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Grammar stats
    const grammarStats = await Grammar.find({ userId });
    const completedTenses = grammarStats.filter(g => g.completed).length;
    const totalExercises = grammarStats.reduce((sum, g) => sum + g.exercisesAttempted, 0);
    const correctExercises = grammarStats.reduce((sum, g) => sum + g.exercisesCorrect, 0);

    // Sentence stats
    const sentenceCount = await Sentence.countDocuments({ userId });
    const avgSentenceScore = await Sentence.aggregate([
      { $match: { userId: new ObjectId(userId) } },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$feedback.score' }
        }
      }
    ]);

    // Session stats
    const sessions = await ChatSession.find({ userId });
    let totalLearningTime = 0;
    sessions.forEach(session => {
      if (session.sessionDuration) {
        totalLearningTime += session.sessionDuration;
      }
    });

    res.json({
      success: true,
      statistics: {
        vocabulary: {
          unknown: vocabStats.find(v => v._id === 'unknown')?.count || 0,
          learning: vocabStats.find(v => v._id === 'learning')?.count || 0,
          known: vocabStats.find(v => v._id === 'known')?.count || 0,
          mastered: vocabStats.find(v => v._id === 'mastered')?.count || 0,
          total: vocabStats.reduce((sum, v) => sum + v.count, 0)
        },
        grammar: {
          completedTenses,
          totalTenses: 12,
          exercisesAttempted: totalExercises,
          exercisesCorrect: correctExercises,
          accuracy: totalExercises > 0 ? ((correctExercises / totalExercises) * 100).toFixed(2) : 0
        },
        sentences: {
          submitted: sentenceCount,
          averageScore: avgSentenceScore[0]?.avgScore || 0
        },
        learning: {
          totalLearningTime: Math.round(totalLearningTime / 3600),
          totalSessions: sessions.length
        }
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update user preferences
 */
exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.userId;
    const { dailyGoal, learningReminder, language } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        'preferences.dailyGoal': dailyGoal || 30,
        'preferences.learningReminder': learningReminder !== undefined ? learningReminder : true,
        'preferences.language': language || 'vi'
      },
      { new: true }
    ).select('-password -emailVerificationToken');

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
