const mongoose = require('mongoose');

const userUsageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Format: "YYYY-MM" to track monthly usage
    month: {
        type: String,
        required: true,
        index: true
    },
    totalRequests: {
        type: Number,
        default: 0
    },
    successRequests: {
        type: Number,
        default: 0
    },
    failedRequests: {
        type: Number,
        default: 0
    },
    // Detailed feature usage counts
    features: {
        type: Map,
        of: Number,
        default: {}
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Compound index for fast lookup
userUsageSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('UserUsage', userUsageSchema);
