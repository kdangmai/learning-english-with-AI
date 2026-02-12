const ChatSession = require('../models/ChatSession');
const ChatbotService = require('../services/chatbotService');

/**
 * Start a new Roleplay session
 */
exports.startRoleplay = async (req, res) => {
    try {
        const { scenario, role } = req.body;
        const userId = req.userId;

        if (!scenario || !role) {
            return res.status(400).json({ success: false, message: 'Scenario and Role are required' });
        }

        const session = new ChatSession({
            userId,
            topic: 'roleplay',
            roleplayConfig: {
                scenario,
                role
            },
            messages: []
        });

        await session.save();

        // Generate initial greeting from the AI role
        // We fake a user message "Hello" to kickstart or just ask the AI to start?
        // Actually, usually the user starts or the AI starts. 
        // Let's have the AI start to set the scene.

        // We'll mimic a system instruction to get the first message.
        // Or we can just return the empty session and let Frontend trigger the first message?
        // A better UX is the AI starts: "Hello, I'm the interviewer. Please have a seat."

        // Let's generate the first message immediately.
        try {
            const greeting = await ChatbotService.generateRoleplayResponse(
                scenario,
                role,
                [],
                "Hello!" // Initial trigger from user (hidden) or just blank prompt with instruction "Start the conversation"
            );

            // Actually generateRoleplayResponse takes a user message.
            // Let's just create the session and return. The FE can decide to send a "Hi" or we can do it here.
            // Let's trigger a greeting.

            const prompt = "Please start the conversation with a greeting appropriate for your role.";
            const aiGreeting = await ChatbotService.generateRoleplayResponse(scenario, role, [], prompt);

            session.messages.push({
                role: 'assistant',
                content: aiGreeting,
                timestamp: new Date()
            });
            await session.save();
        } catch (e) {
            console.warn("Failed to generate initial greeting", e);
        }

        res.status(201).json({
            success: true,
            sessionId: session._id,
            messages: session.messages,
            scenario: session.roleplayConfig.scenario,
            role: session.roleplayConfig.role
        });

    } catch (error) {
        console.error('Start roleplay error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Send message in roleplay
 */
exports.sendMessage = async (req, res) => {
    try {
        const { sessionId, message, audio } = req.body;
        const userId = req.userId;

        if (!message && !audio) {
            return res.status(400).json({ success: false, message: 'Message or Audio is required' });
        }

        const session = await ChatSession.findOne({ _id: sessionId, userId });
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        // Add user message
        session.messages.push({
            role: 'user',
            content: message || '(Audio Message)',
            type: audio ? 'audio' : 'text',
            timestamp: new Date()
        });

        const { scenario, role } = session.roleplayConfig;

        // Clean base64 data if needed
        let audioData = null;
        if (audio) {
            audioData = {
                mimeType: audio.mimeType || 'audio/webm',
                data: audio.data.replace(/^data:audio\/[a-z]+;base64,/, '')
            };
        }

        // Get AI response
        const response = await ChatbotService.generateRoleplayResponse(
            scenario,
            role,
            session.messages, // Pass history containing new user message
            message || '',
            audioData
        );

        session.messages.push({
            role: 'assistant',
            content: response,
            timestamp: new Date()
        });

        await session.save();

        res.json({
            success: true,
            message: response,
            messages: session.messages
        });

    } catch (error) {
        console.error('Roleplay message error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * End session and Generate Report
 */
exports.endSession = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const userId = req.userId;

        const session = await ChatSession.findOne({ _id: sessionId, userId });
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        const { scenario, role } = session.roleplayConfig;

        // Generate Report
        const reportData = await ChatbotService.generateRoleplayReport(scenario, role, session.messages);

        // Save report
        session.roleplayConfig.report = {
            date: new Date(),
            ...reportData
        };

        await session.save();

        res.json({
            success: true,
            report: session.roleplayConfig.report
        });

    } catch (error) {
        console.error('Roleplay report error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
