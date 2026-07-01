const mongoose = require('mongoose');

const ideaSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: 'default',
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    default: ''
  },
  tags: [{ type: String }],
  status: {
    type: String,
    enum: ['raw', 'explored', 'shelved', 'building'],
    default: 'raw'
  },

  // AI-generated scores (0-10 each)
  scores: {
    business:   { type: Number, min: 0, max: 10, default: null },
    technical:  { type: Number, min: 0, max: 10, default: null },
    difficulty: { type: Number, min: 0, max: 10, default: null },
    overall:    { type: Number, min: 0, max: 10, default: null }
  },

  aiAnalysis: {
    type: String,
    default: ''
  },
  estimatedHours: {
    type: Number,
    default: null
  },
  relatedProjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  pinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

ideaSchema.index({ userId: 1, status: 1 });
ideaSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });

module.exports = mongoose.model('Idea', ideaSchema);
