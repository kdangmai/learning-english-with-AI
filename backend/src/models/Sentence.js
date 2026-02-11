const mongoose = require('mongoose');

const sentenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Original sentence in Vietnamese
  vietnameseSentence: {
    type: String,
    required: true
  },

  // User's answer
  userAnswer: {
    type: String,
    required: true
  },

  // AI reference translation
  aiReference: String,

  // Difficulty level
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    default: 'easy'
  },

  // Feedback
  feedback: {
    score: { type: Number, min: 0, max: 100 },
    grammarScore: { type: Number, min: 0, max: 100 },
    vocabularyScore: { type: Number, min: 0, max: 100 },
    grammarErrors: [String],
    suggestions: [String],
    improvedVersion: String
  },

  // Hints (for medium and hard levels)
  hints: {
    vocabularyHints: [String],
    grammarStructures: [String]
  },

  // Status
  status: {
    type: String,
    enum: ['submitted', 'graded', 'upgraded'],
    default: 'submitted'
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  gradedAt: Date
});

sentenceSchema.index({ userId: 1, createdAt: -1 });
sentenceSchema.index({ userId: 1, difficulty: 1 });
sentenceSchema.index({ userId: 1, 'feedback.score': 1 });

module.exports = mongoose.model('Sentence', sentenceSchema);
