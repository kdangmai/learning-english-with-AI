const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const connectDB = require('../src/config/database');
const ChatbotService = require('../src/services/chatbotService');

const runTest = async () => {
    try {
        await connectDB();

        console.log("Connected to DB. Testing Pronunciation Analysis...");
        console.log("Target: I would like a cup of coffee.");
        console.log("Spoken: I wood like a cap of coffee.");

        const result = await ChatbotService.analyzePronunciation(
            "I would like a cup of coffee.",
            "I wood like a cap of coffee."
        );

        console.log("Analysis Result:", JSON.stringify(result, null, 2));

    } catch (error) {
        console.error("Test Failed:", error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
};

runTest();
