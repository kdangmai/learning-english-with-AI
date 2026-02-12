const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed, assuming run from backend/scripts or backend/
const SystemSetting = require('../src/models/SystemSetting');
const ApiKey = require('../src/models/ApiKey');

const SAFE_MODEL = 'gemini-1.5-flash';
const SAFE_PRO_MODEL = 'gemini-1.5-pro';

async function fixModels() {
    try {
        console.log('Connecting to database...');
        // Try connecting with the URI from env
        if (!process.env.MONGODB_URI) {
            // Fallback or error
            console.error("MONGODB_URI not found in env.");
            // Try searching in parent dir .env if this file is in src/scripts or similar
            // But for now let's assume valid environment if run from correct place
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // 1. Fix System Settings
        console.log('Checking System Settings...');
        const settings = await SystemSetting.find({});
        for (const s of settings) {
            if (s.value.includes('gemini-2.0') || s.value.includes('exp')) {
                console.log(`Fixing setting ${s.key}: ${s.value} -> ${SAFE_MODEL}`);
                s.value = SAFE_MODEL;
                await s.save();
            }
        }

        // 2. Fix API Keys
        console.log('Checking API Keys...');
        const keys = await ApiKey.find({});
        for (const k of keys) {
            if (k.model && (k.model.includes('gemini-2.0') || k.model.includes('exp'))) {
                console.log(`Fixing Key ${k.name}: ${k.model} -> ${SAFE_MODEL}`);
                k.model = SAFE_MODEL;
                await k.save();
            }
        }

        console.log('Accessing Admin Config to force update defaults if missing...');
        // Ensure all standard keys exist
        const defaults = {
            chatbot_model: SAFE_MODEL,
            grammar_model: SAFE_MODEL,
            vocabulary_model: SAFE_MODEL,
            pronunciation_model: SAFE_MODEL,
            upgrade_model: SAFE_PRO_MODEL
        };

        for (const [key, val] of Object.entries(defaults)) {
            await SystemSetting.findOneAndUpdate(
                { key },
                { $setOnInsert: { value: val } }, // Only if missing
                { upsert: true }
            );
            // Also if it exists but is invalid, we might have caught it above? 
            // Force overwrite if it was "gemini-3.0" which might also be invalid for v1beta if not available
            const current = await SystemSetting.findOne({ key });
            if (current && (current.value.includes('3.0') || current.value.includes('exp'))) {
                console.log(`Overwriting unsafe ${key}: ${current.value} -> ${val}`);
                current.value = val;
                await current.save();
            }
        }

        console.log('Done. Exiting.');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixModels();
