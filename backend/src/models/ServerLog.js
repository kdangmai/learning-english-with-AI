const mongoose = require('mongoose');

const serverLogSchema = new mongoose.Schema({
    level: {
        type: String,
        enum: ['info', 'warn', 'error', 'debug'],
        default: 'info'
    },
    source: {
        type: String,
        enum: ['auth', 'api', 'system', 'database', 'email', 'ai', 'admin'],
        default: 'system'
    },
    message: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    ip: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Auto-delete logs older than 30 days
serverLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
// Index for efficient queries
serverLogSchema.index({ level: 1, source: 1, createdAt: -1 });

module.exports = mongoose.model('ServerLog', serverLogSchema);
