const mongoose = require('mongoose');

const relationshipSchema = new mongoose.Schema({
  targetId:   { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeNode' },
  targetName: { type: String },
  type:       { type: String }  // e.g. 'uses', 'depends_on', 'related_to', 'created_by'
}, { _id: false });

const knowledgeNodeSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: 'default',
    index: true
  },
  type: {
    type: String,
    enum: ['person', 'project', 'concept', 'file', 'code', 'tool', 'company', 'note'],
    default: 'concept'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  tags: [{ type: String }],

  // Graph edges — stored denormalised with targetName for fast graph rendering
  relationships: [relationshipSchema],

  // Flexible catch-all for type-specific data (URLs, file paths, code snippets, etc.)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

knowledgeNodeSchema.index({ userId: 1, type: 1 });
knowledgeNodeSchema.index({ userId: 1, name: 'text', description: 'text' });

module.exports = mongoose.model('KnowledgeNode', knowledgeNodeSchema);
