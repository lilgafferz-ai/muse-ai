const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  text: { type: String, required: true },
  done: { type: Boolean, default: false }
}, { _id: true });

const projectSchema = new mongoose.Schema({
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
  description: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#7c3aed'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  },
  goals: [goalSchema],
  roadmap: {
    type: String,
    default: ''
  },
  tags: [{ type: String }],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  pinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

projectSchema.index({ userId: 1, status: 1 });
projectSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });

module.exports = mongoose.model('Project', projectSchema);
