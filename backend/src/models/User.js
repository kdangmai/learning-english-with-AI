const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  fullName: String,
  avatar: String,
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  otpCode: String,
  otpExpires: Date,

  // Learning statistics
  totalLearningTime: {
    type: Number,
    default: 0 // in minutes
  },
  currentLevel: {
    type: String,
    enum: ['beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced', 'expert', 'master', 'legend'],
    default: 'beginner'
  },
  xp: {
    type: Number,
    default: 0
  },
  streak: {
    type: Number,
    default: 0
  },
  lastActiveDate: {
    type: Date,
    default: null
  },
  claimedMissions: {
    type: [String],
    default: []
  },

  // Detailed Activity Stats for Leaderboard
  stats: {
    vocabLearned: { type: Number, default: 0 },
    roleplaySessions: { type: Number, default: 0 },
    grammarExercises: { type: Number, default: 0 },
    sentencesPracticed: { type: Number, default: 0 },
    pronunciationPracticed: { type: Number, default: 0 }
  },

  // Learning preferences
  preferences: {
    dailyGoal: { type: Number, default: 30 }, // minutes
    learningReminder: { type: Boolean, default: true },
    language: { type: String, default: 'vi' }
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

// Hash password before saving
// Hash password and OTP before saving
userSchema.pre('save', async function (next) {
  try {
    // Hash password if modified
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    // Hash OTP if modified and present
    if (this.isModified('otpCode') && this.otpCode) {
      const salt = await bcrypt.genSalt(10);
      this.otpCode = await bcrypt.hash(this.otpCode, salt);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to verify OTP
userSchema.methods.verifyOTP = async function (candidateOTP) {
  return await bcrypt.compare(candidateOTP, this.otpCode);
};

module.exports = mongoose.model('User', userSchema);
