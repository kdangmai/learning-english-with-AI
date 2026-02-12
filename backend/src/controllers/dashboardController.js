const User = require('../models/User');
const Vocabulary = require('../models/Vocabulary');
const Grammar = require('../models/Grammar');
const Sentence = require('../models/Sentence');
const ChatSession = require('../models/ChatSession');
const mongoose = require('mongoose');

/**
 * Get dashboard overview
 */
exports.getOverview = async (req, res) => {
  try {
    const userId = req.userId;
    const ObjectId = mongoose.Types.ObjectId;

    // Get user info
    const user = await User.findById(userId);

    // Count vocabulary by status
    const vocabByStatus = await Vocabulary.aggregate([
      { $match: { userId: new ObjectId(userId) } },
      {
        $group: {
          _id: '$mastery.status',
          count: { $sum: 1 }
        }
      }
    ]);

    const masteredCount = vocabByStatus.find(v => v._id === 'mastered')?.count || 0;
    const totalVocab = await Vocabulary.countDocuments({ userId });

    // Count completed tenses
    const completedTenses = await Grammar.countDocuments({
      userId,
      completed: true
    });

    // Count sentences submitted
    const sentenceCount = await Sentence.countDocuments({ userId });

    // Calculate total learning time
    const sessions = await ChatSession.find({ userId });
    let totalTime = 0;
    sessions.forEach(session => {
      if (session.sessionDuration) {
        totalTime += session.sessionDuration;
      }
    });
    const totalHours = Math.round(totalTime / 3600);

    res.json({
      success: true,
      stats: {
        totalLearningTime: totalHours,
        vocabularyMastered: masteredCount,
        totalVocabulary: totalVocab,
        tensesCompleted: `${completedTenses}/12`,
        sentencesSubmitted: sentenceCount,
        currentLevel: user?.currentLevel || 'beginner'
      }
    });
  } catch (error) {
    console.error('Get overview error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get grammar progress for chart
 */
exports.getGrammarProgress = async (req, res) => {
  try {
    const userId = req.userId;

    // All 12 tenses
    const ALL_TENSES = [
      'Simple Present', 'Present Continuous', 'Present Perfect', 'Present Perfect Continuous',
      'Simple Past', 'Past Continuous', 'Past Perfect', 'Past Perfect Continuous',
      'Simple Future', 'Future Continuous', 'Future Perfect', 'Future Perfect Continuous'
    ];

    const progress = await Grammar.find({ userId });

    // Map by tenseName for quick lookup
    const progressMap = {};
    progress.forEach(g => { progressMap[g.tenseName] = g; });

    // Always return all 12 tenses
    const chartData = ALL_TENSES.map(tense => {
      const g = progressMap[tense];
      return {
        name: tense,
        progress: g?.progress || 0,
        completed: g?.completed || false,
        exercisesAttempted: g?.exercisesAttempted || 0,
        exercisesCorrect: g?.exercisesCorrect || 0,
        lessonsCompleted: g?.lessonsCompleted || 0
      };
    });

    res.json({
      success: true,
      data: chartData,
      completed: progress.filter(p => p.completed).length,
      total: 12
    });
  } catch (error) {
    console.error('Get grammar progress error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get vocabulary statistics
 */
exports.getVocabularyStats = async (req, res) => {
  try {
    const userId = req.userId;
    const ObjectId = mongoose.Types.ObjectId;

    // Stats by mastery status
    const statusStats = await Vocabulary.aggregate([
      { $match: { userId: new ObjectId(userId) } },
      {
        $group: {
          _id: '$mastery.status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Stats by topic
    const topicStats = await Vocabulary.aggregate([
      { $match: { userId: new ObjectId(userId) } },
      {
        $group: {
          _id: '$topic',
          total: { $sum: 1 },
          mastered: {
            $sum: { $cond: [{ $eq: ['$mastery.status', 'mastered'] }, 1, 0] }
          }
        }
      }
    ]);

    // Format for pie chart
    const statusChartData = statusStats.map(s => ({
      name: s._id || 'unknown',
      value: s.count
    }));

    // Format for heatmap
    const heatmapData = topicStats.map(t => ({
      topic: t._id || 'other',
      total: t.total,
      mastered: t.mastered,
      percentage: Math.round((t.mastered / t.total) * 100)
    }));

    res.json({
      success: true,
      statusChart: statusChartData,
      heatmap: heatmapData,
      summary: statusStats
    });
  } catch (error) {
    console.error('Get vocabulary stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get session statistics
 */
exports.getSessionStats = async (req, res) => {
  try {
    const userId = req.userId;
    const ObjectId = mongoose.Types.ObjectId;

    // Get sentences by week
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weeklyStats = await Sentence.aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          submitted: { $sum: 1 },
          avgScore: { $avg: '$feedback.score' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Total statistics
    const totalSessions = await ChatSession.countDocuments({ userId });
    const totalSentences = await Sentence.countDocuments({ userId });

    const avgScore = await Sentence.aggregate([
      { $match: { userId: new ObjectId(userId) } },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$feedback.score' }
        }
      }
    ]);

    res.json({
      success: true,
      weeklyData: weeklyStats,
      summary: {
        totalSessions,
        totalSentences,
        averageScore: avgScore[0]?.avgScore || 0
      }
    });
  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get weekly report
 */
exports.getWeeklyReport = async (req, res) => {
  try {
    const userId = req.userId;
    const ObjectId = mongoose.Types.ObjectId;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Weekly vocabulary progress
    const weeklyVocabProgress = await Vocabulary.aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          totalAdded: { $sum: 1 },
          masteredThisWeek: {
            $sum: { $cond: [{ $eq: ['$mastery.status', 'mastered'] }, 1, 0] }
          }
        }
      }
    ]);

    // Weekly sentences
    const weeklySentences = await Sentence.countDocuments({
      userId,
      createdAt: { $gte: sevenDaysAgo }
    });

    // Weekly grammar exercises
    const weeklyGrammar = await Grammar.aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          updatedAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          exercisesAttempted: { $sum: '$exercisesAttempted' },
          exercisesCorrect: { $sum: '$exercisesCorrect' }
        }
      }
    ]);

    res.json({
      success: true,
      report: {
        period: 'Weekly',
        startDate: sevenDaysAgo,
        endDate: now,
        vocabulary: weeklyVocabProgress[0] || { totalAdded: 0 },
        sentences: weeklySentences,
        grammar: weeklyGrammar[0] || { exercisesAttempted: 0, exercisesCorrect: 0 }
      }
    });
  } catch (error) {
    console.error('Get weekly report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get monthly report
 */
exports.getMonthlyReport = async (req, res) => {
  try {
    const userId = req.userId;
    const ObjectId = mongoose.Types.ObjectId;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Monthly vocabulary progress
    const monthlyVocabProgress = await Vocabulary.aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          totalAdded: { $sum: 1 },
          masteredThisMonth: {
            $sum: { $cond: [{ $eq: ['$mastery.status', 'mastered'] }, 1, 0] }
          }
        }
      }
    ]);

    // Monthly sentences
    const monthlySentences = await Sentence.countDocuments({
      userId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Monthly grammar exercises
    const monthlyGrammar = await Grammar.aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          updatedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          exercisesAttempted: { $sum: '$exercisesAttempted' },
          exercisesCorrect: { $sum: '$exercisesCorrect' }
        }
      }
    ]);

    res.json({
      success: true,
      report: {
        period: 'Monthly',
        startDate: thirtyDaysAgo,
        endDate: now,
        vocabulary: monthlyVocabProgress[0] || { totalAdded: 0 },
        sentences: monthlySentences,
        grammar: monthlyGrammar[0] || { exercisesAttempted: 0, exercisesCorrect: 0 }
      }
    });
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
