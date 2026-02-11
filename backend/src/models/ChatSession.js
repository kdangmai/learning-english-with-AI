const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topic: {
    type: String,
    enum: ['grammar', 'vocabulary', 'sentence-writing', 'general', 'roleplay'],
    default: 'general'
  },
  roleplayConfig: {
    scenario: String,
    role: String,
    report: {
      date: Date,
      naturalness: Number,
      grammar_errors: Array,
      vocabulary_suggestions: Array,
      overall_comment: String
    }
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant']
    },
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  sessionDuration: Number, // in seconds
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

chatSessionSchema.index({ userId: 1, createdAt: -1 });
chatSessionSchema.index({ userId: 1, topic: 1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
