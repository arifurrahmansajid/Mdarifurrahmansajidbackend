const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  thumbnail: { type: String },
  tags: { type: [String], default: [] },
  categories: { type: [String], default: [] },
  status: { type: String, default: 'draft' },
  views: { type: Number, default: 0 },
  readTime: { type: Number, default: 0 },
  seoTitle: { type: String },
  seoDescription: { type: String },
  seoKeywords: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);
