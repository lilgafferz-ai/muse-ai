const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  userId: {
    type: String,
    default: 'default',
    index: true
  },
  type: {
    type: String,
    enum: ['preference', 'emotion', 'fact', 'goal', 'relationship', 'topic', 'personality'],
    required: true
  },
  key: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
  context: {
    type: String,
    default: ''
  },
  importance: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  embedding: {
    type: [Number],
    default: []
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

memorySchema.index({ userId: 1, type: 1 });
memorySchema.index({ userId: 1, key: 1 });
memorySchema.index({ importance: -1 });

module.exports = mongoose.model('Memory', memorySchema);
