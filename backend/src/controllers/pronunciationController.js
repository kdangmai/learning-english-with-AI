const ChatbotService = require('../services/chatbotService');

/**
 * Analyze pronunciation based on STT result
 * @route POST /api/pronunciation/analyze
 */
exports.analyzePronunciation = async (req, res) => {
    try {
        const { targetSentence, userSpokenSentence, audioData } = req.body;

        if (!targetSentence) {
            return res.status(400).json({ success: false, message: 'Missing target sentence' });
        }

        if (!userSpokenSentence && !audioData) {
            return res.status(400).json({ success: false, message: 'Missing spoken input (text or audio)' });
        }

        const input = audioData || userSpokenSentence;
        const isAudio = !!audioData;
        const result = await ChatbotService.analyzePronunciation(targetSentence, input, isAudio);

        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Pronunciation analysis error:', error);
        res.status(500).json({ success: false, message: 'Failed to analyze pronunciation' });
    }
};

/**
 * Generate a practice sentence based on proficiency level
 * @route GET /api/pronunciation/generate
 */
exports.generateSentence = async (req, res) => {
    try {
        const { level } = req.query; // 'A1', 'B2', etc.
        const effectiveLevel = level || 'A1';

        const sentence = await ChatbotService.generatePracticeSentence(effectiveLevel);

        res.json({ success: true, sentence });
    } catch (error) {
        console.error('Generate sentence error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate sentence' });
    }
};
