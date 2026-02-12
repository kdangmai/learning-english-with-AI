const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const MODELS_TO_TEST = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-002',
    'gemini-1.5-pro',
    'gemini-2.0-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-pro-exp-02-05'
];

async function testModels() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/english-learning');
        console.log('Connected to MongoDB');

        const ApiKey = require('./src/models/ApiKey');
        const activeKeys = await ApiKey.find({ isActive: true });

        if (activeKeys.length === 0) {
            console.log('No active keys found. Activating all keys for testing...');
            await ApiKey.updateMany({}, { isActive: true });
            // Fetch again
        }
        const keys = await ApiKey.find({ isActive: true });

        if (keys.length === 0) {
            console.error("Still no keys.");
            process.exit(1);
        }

        // Use the first available key for testing models
        const testKey = keys[0].key;
        console.log(`Using key: ${keys[0].name} for testing models...`);

        console.log('\n--- MODEL TEST RESULTS ---');
        const workingModels = [];

        for (const model of MODELS_TO_TEST) {
            process.stdout.write(`Testing ${model}... `);
            try {
                const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
                const response = await axios.post(
                    `${API_URL}?key=${testKey}`,
                    { contents: [{ parts: [{ text: "Hello, just say OK." }] }] },
                    { timeout: 10000 }
                );

                if (response.status === 200 && response.data?.candidates) {
                    console.log('✅ OK');
                    workingModels.push(model);
                } else {
                    console.log('❌ Failed (Invalid response structure)');
                }
            } catch (e) {
                const status = e.response?.status;
                console.log(`❌ Failed (${status || e.message})`);
            }
        }

        console.log('\n--- SUMMARY OF WORKING MODELS ---');
        console.log(JSON.stringify(workingModels, null, 2));

        // Update SystemSettings if possible?
        console.log('\nNext steps: Update these models in frontend/AdminDashboard.js and backend SystemSettings.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testModels();
