const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
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
  priority: {
    type: String,
    enum: ['urgent', 'high', 'medium', 'low'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'done'],
    default: 'todo'
  },
  dueDate: {
    type: Date
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  tags: [{ type: String }],

  // Habit tracking
  isHabit: {
    type: Boolean,
    default: false
  },
  habitStreak: {
    type: Number,
    default: 0
  },
  habitLastDone: {
    type: Date
  },

  estimatedMinutes: {
    type: Number,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, isHabit: 1 });
taskSchema.index({ userId: 1, projectId: 1 });

module.exports = mongoose.model('Task', taskSchema);
