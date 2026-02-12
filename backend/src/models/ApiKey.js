const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        default: 'Gemini Key'
    },
    isActive: {
        type: Boolean,
        default: false
    },
    model: {
        type: String,
        default: 'gemini-2.5-flash-lite'
    },
    provider: {
        type: String,
        enum: ['gemini', 'openai'],
        default: 'gemini'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Allow multiple keys to be active for rotation
// apiKeySchema.pre('save', async function (next) { ... });

module.exports = mongoose.model('ApiKey', apiKeySchema);
