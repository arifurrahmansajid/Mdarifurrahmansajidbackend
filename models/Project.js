const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  thumbnail: { type: String },
  description: { type: String, required: true },
  features: { type: [String], default: [] },
  technologies: { type: [String], default: [] },
  githubLink: { type: String },
  liveSite: { type: String },
  status: { type: String, default: 'draft' },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
