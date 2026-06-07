const mongoose = require('mongoose');

const personalitySchema = new mongoose.Schema({
  userId: {
    type: String,
    default: 'default',
    unique: true,
    index: true
  },
  traits: {
    wit: { type: Number, default: 7, min: 1, max: 10 },
    sarcasm: { type: Number, default: 6, min: 1, max: 10 },
    empathy: { type: Number, default: 8, min: 1, max: 10 },
    playfulness: { type: Number, default: 7, min: 1, max: 10 },
    formality: { type: Number, default: 2, min: 1, max: 10 },
    warmth: { type: Number, default: 8, min: 1, max: 10 }
  },
  communicationStyle: {
    type: String,
    enum: ['direct', 'playful', 'supportive', 'sarcastic', 'philosophical'],
    default: 'playful'
  },
  nicknames: [{
    name: String,
    used: { type: Number, default: 0 }
  }],
  customInstructions: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

personalitySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Personality', personalitySchema);
