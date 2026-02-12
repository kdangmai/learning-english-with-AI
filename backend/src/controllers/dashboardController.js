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

// ==================== LEVEL SYSTEM ====================
const LEVEL_THRESHOLDS = {
  beginner: 0,
  elementary: 500,
  intermediate: 2000,
  'upper-intermediate': 5000,
  advanced: 10000,
  expert: 25000,
  master: 50000,
  legend: 100000
};

const LEVEL_ORDER = [
  'beginner', 'elementary', 'intermediate',
  'upper-intermediate', 'advanced', 'expert',
  'master', 'legend'
];

function calculateLevel(xp) {
  let level = 'beginner';
  for (const lvl of LEVEL_ORDER) {
    if (xp >= LEVEL_THRESHOLDS[lvl]) level = lvl;
    else break;
  }
  const currentIdx = LEVEL_ORDER.indexOf(level);
  const nextLevel = currentIdx < LEVEL_ORDER.length - 1
    ? LEVEL_ORDER[currentIdx + 1] : null;

  const currentThreshold = LEVEL_THRESHOLDS[level];
  const nextThreshold = nextLevel
    ? LEVEL_THRESHOLDS[nextLevel] : currentThreshold;
  const xpInLevel = xp - currentThreshold;
  const xpForNext = nextThreshold - currentThreshold;
  const xpProgress = xpForNext > 0
    ? Math.round((xpInLevel / xpForNext) * 100) : 100;
  const xpNeeded = nextThreshold - xp;

  return {
    level,
    nextLevel,
    xpProgress,
    xpNeeded: Math.max(0, xpNeeded)
  };
}

// ==================== MISSIONS ====================
/**
 * Get user missions based on real activity
 */
exports.getMissions = async (req, res) => {
  try {
    const userId = req.userId;
    const ObjectId = mongoose.Types.ObjectId;
    const user = await User.findById(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parallel queries for mission progress
    const [
      todayNewWords,
      masteredVocab,
      dueReviewCount,
      totalGrammarExercises,
      todaySentences,
      totalSentences,
      roleplaySessions,
      totalReviews,
      todayChatSessions,
      perfectSentences
    ] = await Promise.all([
      Vocabulary.countDocuments({
        userId, createdAt: { $gte: today }
      }),
      Vocabulary.countDocuments({
        userId, 'mastery.status': 'mastered'
      }),
      Vocabulary.countDocuments({
        userId,
        'mastery.nextReviewDate': { $lte: new Date() },
        'mastery.status': { $ne: 'mastered' }
      }),
      Grammar.aggregate([
        { $match: { userId: new ObjectId(userId) } },
        {
          $group: {
            _id: null,
            total: { $sum: '$exercisesAttempted' }
          }
        }
      ]),
      Sentence.countDocuments({
        userId, createdAt: { $gte: today }
      }),
      Sentence.countDocuments({ userId }),
      ChatSession.countDocuments({
        userId, scenario: { $exists: true }
      }),
      Vocabulary.aggregate([
        { $match: { userId: new ObjectId(userId) } },
        {
          $group: {
            _id: null,
            total: { $sum: '$mastery.reviewCount' }
          }
        }
      ]),
      ChatSession.countDocuments({
        userId, createdAt: { $gte: today }
      }),
      Sentence.countDocuments({
        userId, 'feedback.score': { $gte: 9 }
      })
    ]);

    const grammarTotal =
      totalGrammarExercises[0]?.total || 0;
    const reviewTotal = totalReviews[0]?.total || 0;
    const claimed = user?.claimedMissions || [];
    const todayStr = new Date().toISOString().slice(0, 10);

    // Build missions dynamically
    const missions = [
      {
        id: `daily-vocab-${todayStr}`,
        type: 'daily',
        category: 'vocabulary',
        icon: '📖',
        title: 'Học 5 từ mới hôm nay',
        description: 'Thêm 5 từ vựng mới vào kho từ của bạn',
        target: 5,
        current: Math.min(todayNewWords, 5),
        progress: Math.min(
          (todayNewWords / 5) * 100, 100
        ),
        completed: todayNewWords >= 5,
        claimed: claimed.includes(
          `daily-vocab-${todayStr}`
        ),
        xp: 20,
        link: '/vocabulary'
      },
      {
        id: `daily-sentence-${todayStr}`,
        type: 'daily',
        category: 'sentence',
        icon: '✍️',
        title: 'Luyện 3 câu dịch hôm nay',
        description: 'Nộp 3 bài luyện dịch câu',
        target: 3,
        current: Math.min(todaySentences, 3),
        progress: Math.min(
          (todaySentences / 3) * 100, 100
        ),
        completed: todaySentences >= 3,
        claimed: claimed.includes(
          `daily-sentence-${todayStr}`
        ),
        xp: 20,
        link: '/sentence-writing'
      },
      {
        id: `daily-chat-${todayStr}`,
        type: 'daily',
        category: 'communication',
        icon: '💬',
        title: 'Trò chuyện với AI',
        description: 'Bắt đầu 1 phiên chat với AI tutor',
        target: 1,
        current: Math.min(todayChatSessions, 1),
        progress: Math.min(
          todayChatSessions * 100, 100
        ),
        completed: todayChatSessions >= 1,
        claimed: claimed.includes(
          `daily-chat-${todayStr}`
        ),
        xp: 15,
        link: '/chatbot'
      },
      {
        id: 'milestone-vocab-50',
        type: 'milestone',
        category: 'vocabulary',
        icon: '🏅',
        title: 'Thành thạo 50 từ vựng',
        description: 'Đạt trạng thái thành thạo 50 từ',
        target: 50,
        current: Math.min(masteredVocab, 50),
        progress: Math.min(
          (masteredVocab / 50) * 100, 100
        ),
        completed: masteredVocab >= 50,
        claimed: claimed.includes('milestone-vocab-50'),
        xp: 100,
        link: '/vocabulary'
      },
      {
        id: 'milestone-grammar-50',
        type: 'milestone',
        category: 'grammar',
        icon: '📐',
        title: 'Hoàn thành 50 bài ngữ pháp',
        description: 'Làm tổng cộng 50 bài tập ngữ pháp',
        target: 50,
        current: Math.min(grammarTotal, 50),
        progress: Math.min(
          (grammarTotal / 50) * 100, 100
        ),
        completed: grammarTotal >= 50,
        claimed: claimed.includes(
          'milestone-grammar-50'
        ),
        xp: 100,
        link: '/grammar'
      },
      {
        id: 'milestone-sentence-20',
        type: 'milestone',
        category: 'sentence',
        icon: '🎯',
        title: 'Nộp 20 bài luyện dịch',
        description: 'Tổng cộng 20 câu đã luyện dịch',
        target: 20,
        current: Math.min(totalSentences, 20),
        progress: Math.min(
          (totalSentences / 20) * 100, 100
        ),
        completed: totalSentences >= 20,
        claimed: claimed.includes(
          'milestone-sentence-20'
        ),
        xp: 80,
        link: '/sentence-writing'
      },
      {
        id: 'milestone-perfect-5',
        type: 'milestone',
        category: 'sentence',
        icon: '⭐',
        title: 'Đạt 5 bài điểm 9+',
        description: 'Nhận điểm 9 trở lên ở 5 bài dịch',
        target: 5,
        current: Math.min(perfectSentences, 5),
        progress: Math.min(
          (perfectSentences / 5) * 100, 100
        ),
        completed: perfectSentences >= 5,
        claimed: claimed.includes(
          'milestone-perfect-5'
        ),
        xp: 80,
        link: '/sentence-writing'
      },
      {
        id: 'milestone-review-100',
        type: 'milestone',
        category: 'vocabulary',
        icon: '🔄',
        title: 'Ôn tập 100 lượt từ vựng',
        description: 'Tổng cộng 100 lượt ôn tập SRS',
        target: 100,
        current: Math.min(reviewTotal, 100),
        progress: Math.min(
          (reviewTotal / 100) * 100, 100
        ),
        completed: reviewTotal >= 100,
        claimed: claimed.includes(
          'milestone-review-100'
        ),
        xp: 80,
        link: '/vocabulary'
      },
      {
        id: 'milestone-roleplay-3',
        type: 'milestone',
        category: 'communication',
        icon: '🎭',
        title: 'Hoàn thành 3 phiên Roleplay',
        description: 'Đóng vai 3 kịch bản khác nhau',
        target: 3,
        current: Math.min(roleplaySessions, 3),
        progress: Math.min(
          (roleplaySessions / 3) * 100, 100
        ),
        completed: roleplaySessions >= 3,
        claimed: claimed.includes(
          'milestone-roleplay-3'
        ),
        xp: 60,
        link: '/roleplay'
      }
    ];

    // Calculate streak
    let streak = user?.streak || 0;
    const lastActive = user?.lastActiveDate;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    if (lastActive) {
      const lastActiveDay = new Date(lastActive);
      lastActiveDay.setHours(0, 0, 0, 0);
      if (lastActiveDay.getTime() === today.getTime()) {
        // Already active today - streak unchanged
      } else if (
        lastActiveDay.getTime() === yesterday.getTime()
      ) {
        // Active yesterday - increment streak
        streak += 1;
        await User.findByIdAndUpdate(userId, {
          streak,
          lastActiveDate: new Date()
        });
      } else {
        // Streak broken
        streak = 1;
        await User.findByIdAndUpdate(userId, {
          streak: 1,
          lastActiveDate: new Date()
        });
      }
    } else {
      streak = 1;
      await User.findByIdAndUpdate(userId, {
        streak: 1,
        lastActiveDate: new Date()
      });
    }

    const xp = user?.xp || 0;
    const levelInfo = calculateLevel(xp);

    res.json({
      success: true,
      missions,
      xp,
      level: levelInfo.level,
      levelInfo,
      streak
    });
  } catch (error) {
    console.error('Get missions error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Claim mission reward (add XP)
 */
exports.claimMission = async (req, res) => {
  try {
    const userId = req.userId;
    const { missionId, xp: xpReward } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already claimed
    if (user.claimedMissions?.includes(missionId)) {
      return res.status(400).json({
        success: false,
        message: 'Mission already claimed'
      });
    }

    // Add XP and update claimed missions
    const newXp = (user.xp || 0) + (xpReward || 0);
    const levelInfo = calculateLevel(newXp);

    await User.findByIdAndUpdate(userId, {
      xp: newXp,
      currentLevel: levelInfo.level,
      $push: { claimedMissions: missionId }
    });

    res.json({
      success: true,
      xp: newXp,
      level: levelInfo.level,
      levelInfo,
      streak: user.streak || 0
    });
  } catch (error) {
    console.error('Claim mission error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all dashboard data in one request
 */
exports.getAllDashboardData = async (req, res) => {
  try {
    // Reuse existing handlers by simulating
    // individual responses
    const fakeRes = (resolve) => ({
      json: (data) => resolve(data),
      status: () => ({
        json: (data) => resolve(data)
      })
    });

    const results = await Promise.all([
      new Promise(r =>
        exports.getOverview(req, fakeRes(r))),
      new Promise(r =>
        exports.getVocabularyStats(req, fakeRes(r))),
      new Promise(r =>
        exports.getGrammarProgress(req, fakeRes(r))),
      new Promise(r =>
        exports.getSessionStats(req, fakeRes(r))),
      new Promise(r =>
        exports.getWeeklyReport(req, fakeRes(r))),
      new Promise(r =>
        exports.getMissions(req, fakeRes(r)))
    ]);

    const [
      ovData, vocData, gramData,
      sessData, weekData, missData
    ] = results;

    // Also get SRS stats
    let srsStats = null;
    try {
      const vocabController =
        require('./vocabularyController');
      const srsResult = await new Promise(r =>
        vocabController.getSrsStats(req, fakeRes(r)));
      if (srsResult.success) {
        srsStats = srsResult.stats;
      }
    } catch (e) {
      // SRS stats optional
    }

    res.json({
      success: true,
      overview: ovData.success ? ovData.stats : null,
      vocabStats: vocData.success ? vocData : null,
      grammarProgress: gramData.success
        ? gramData : null,
      sessionStats: sessData.success
        ? sessData : null,
      weeklyReport: weekData.success
        ? weekData.report : null,
      srsStats,
      missions: missData.success ? missData : null
    });
  } catch (error) {
    console.error('Get all dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
