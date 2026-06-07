const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

chatSchema.index({ sessionId: 1, timestamp: 1 });

module.exports = mongoose.model('Chat', chatSchema);
