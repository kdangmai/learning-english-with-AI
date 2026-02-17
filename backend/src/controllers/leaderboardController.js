const User = require('../models/User');

/**
 * Get leaderboard data
 * Supported types: exp, vocab, roleplay, grammar, sentence, pronunciation
 */
exports.getLeaderboard = async (req, res) => {
    try {
        const { type = 'exp', limit = '20' } = req.query;
        let sortField = {};
        const parsedLimit = Math.min(parseInt(limit), 100);

        switch (type.toLowerCase()) {
            case 'vocab':
                sortField = { 'stats.vocabLearned': -1, xp: -1 };
                break;
            case 'roleplay':
                sortField = { 'stats.roleplaySessions': -1, xp: -1 };
                break;
            case 'grammar':
                sortField = { 'stats.grammarExercises': -1, xp: -1 };
                break;
            case 'sentence':
                sortField = { 'stats.sentencesPracticed': -1, xp: -1 };
                break;
            case 'pronunciation':
                sortField = { 'stats.pronunciationPracticed': -1, xp: -1 };
                break;
            case 'exp':
            default:
                sortField = { xp: -1 };
                break;
        }

        const users = await User.find({})
            .sort(sortField)
            .limit(parsedLimit)
            .select('username fullName avatar currentLevel xp stats');

        // Enhance response with rank and formatted data
        const leaderboard = users.map((user, index) => ({
            rank: index + 1,
            _id: user._id,
            username: user.username,
            fullName: user.fullName || user.username,
            avatar: user.avatar,
            level: user.currentLevel,
            xp: user.xp,
            // Return specific stat based on type requested
            value: type === 'vocab' ? (user.stats?.vocabLearned || 0)
                : type === 'roleplay' ? (user.stats?.roleplaySessions || 0)
                    : type === 'grammar' ? (user.stats?.grammarExercises || 0)
                        : type === 'sentence' ? (user.stats?.sentencesPracticed || 0)
                            : type === 'pronunciation' ? (user.stats?.pronunciationPracticed || 0)
                                : user.xp,
            // Also return all stats just in case frontend wants to show details
            stats: user.stats
        }));

        res.json({
            success: true,
            type,
            leaderboard
        });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
