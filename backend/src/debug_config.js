const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const SystemSetting = require('../src/models/SystemSetting');

async function checkConfig() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB.');
        const settings = await SystemSetting.find({});
        console.log('Current System Settings:');
        settings.forEach(s => {
            console.log(`Key: "${s.key}", Value: "${s.value}"`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkConfig();
