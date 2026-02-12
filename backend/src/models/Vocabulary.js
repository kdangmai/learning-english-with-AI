const mongoose = require('mongoose');

const vocabularySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  word: {
    type: String,
    required: true,
    lowercase: true
  },
  pronunciation: mongoose.Schema.Types.Mixed, // String (legacy) or { uk: String, us: String }
  meaning: {
    vi: String, // Vietnamese meaning
    en: String  // English meaning
  },
  example: String,
  topic: {
    type: String,
    default: 'general'
  },
  partOfSpeech: {
    type: String,
    enum: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction'],
  },
  level: {
    type: String,
    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    default: 'A1'
  },
  mastery: {
    status: {
      type: String,
      enum: ['unknown', 'learning', 'known', 'mastered'],
      default: 'unknown'
    },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    lastReviewedAt: Date,
    nextReviewAt: Date
  },
  audioUrl: String,
  imageUrl: String,
  // Flag to mark newly generated words for review/flashcard
  isNewWord: {
    type: Boolean,
    default: false
  },

  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },

  // Enhanced SRS Fields
  srs: {
    step: { type: Number, default: 0 }, // Current learning step
    interval: { type: Number, default: 0 }, // Days until next review
    easeFactor: { type: Number, default: 2.5 }, // Difficulty multiplier
    dueDate: { type: Date, default: Date.now }, // Next review date
    lastReviewed: { type: Date, default: null }
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

vocabularySchema.index({ userId: 1, word: 1 });
vocabularySchema.index({ userId: 1, topic: 1 });
vocabularySchema.index({ userId: 1, 'mastery.status': 1 });

module.exports = mongoose.model('Vocabulary', vocabularySchema);
