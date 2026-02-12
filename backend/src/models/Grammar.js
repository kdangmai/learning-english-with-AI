const mongoose = require('mongoose');

const grammarSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenseName: {
    type: String,
    enum: [
      'Simple Present',
      'Present Continuous',
      'Present Perfect',
      'Present Perfect Continuous',
      'Simple Past',
      'Past Continuous',
      'Past Perfect',
      'Past Perfect Continuous',
      'Simple Future',
      'Future Continuous',
      'Future Perfect',
      'Future Perfect Continuous'
    ],
    required: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  
  // Learning data
  lessonsCompleted: {
    type: Number,
    default: 0
  },
  exercisesAttempted: {
    type: Number,
    default: 0
  },
  exercisesCorrect: {
    type: Number,
    default: 0
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

grammarSchema.index({ userId: 1, tenseName: 1 });

module.exports = mongoose.model('Grammar', grammarSchema);
