const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Blog = require('../models/Blog');

const uploadDirectory = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },
  filename: function (req, file, cb) {
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, filename);
  }
});

const upload = multer({ storage: storage });

const parseJsonArray = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseRepeatedOrJsonArray = (reqBody, keys) => {
  for (const key of keys) {
    if (reqBody[key]) {
      if (Array.isArray(reqBody[key])) {
        return reqBody[key];
      }
      return parseJsonArray(reqBody[key]);
    }
  }
  return [];
};

router.get('/', async (req, res) => {
  try {
    const { status, slug } = req.query;

    if (slug) {
      const blog = await Blog.findOne({ slug });
      if (!blog) return res.status(404).json({ error: "Blog not found" });
      
      blog.views += 1;
      await blog.save();
      
      return res.json(blog);
    }

    const query = status ? { status } : {};
    const blogs = await Blog.find(query).sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let blog;
    
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      blog = await Blog.findById(id);
    }
    if (!blog) {
      blog = await Blog.findOne({ slug: id });
    }

    if (!blog) return res.status(404).json({ error: "Blog not found" });

    if (blog.slug === id) {
      blog.views += 1;
      await blog.save();
    }

    res.json(blog);
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const payload = req.body;
    
    if (!payload.title || !payload.content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const thumbnail = req.file ? `/uploads/${req.file.filename}` : undefined;
    const categories = parseRepeatedOrJsonArray(req.body, ["categories[]", "categories"]);
    const tags = parseRepeatedOrJsonArray(req.body, ["tags[]", "tags"]);
    const seoKeywords = parseRepeatedOrJsonArray(req.body, ["meta.seoKeywords[]", "meta.seoKeywords", "seoKeywords[]", "seoKeywords"]);

    let readTime = 0;
    if (payload['meta.readTime']) readTime = Number(payload['meta.readTime']);
    else if (payload.readTime) readTime = Number(payload.readTime);

    let seoTitle = payload['meta.seoTitle'] || payload.seoTitle || null;
    let seoDescription = payload['meta.seoDescription'] || payload.seoDescription || null;

    if (payload.meta) {
        try {
            const metaObj = JSON.parse(payload.meta);
            if (metaObj.readTime) readTime = Number(metaObj.readTime);
            if (metaObj.seoTitle) seoTitle = metaObj.seoTitle;
            if (metaObj.seoDescription) seoDescription = metaObj.seoDescription;
        } catch(e) {}
    }

    const blog = new Blog({
      title: payload.title,
      slug: `${payload.slug || "blog"}-${Date.now()}`,
      content: payload.content,
      thumbnail,
      status: payload.status || 'draft',
      categories,
      tags,
      readTime,
      seoTitle,
      seoDescription,
      seoKeywords,
    });

    await blog.save();
    res.status(201).json(blog);
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

router.put('/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    const payload = req.body;
    let thumbnail = blog.thumbnail;

    if (req.file) {
      if (blog.thumbnail) {
        const oldPath = path.join(__dirname, '../public', blog.thumbnail);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      thumbnail = `/uploads/${req.file.filename}`;
    }

    const categories = parseRepeatedOrJsonArray(req.body, ["categories[]", "categories"]);
    const tags = parseRepeatedOrJsonArray(req.body, ["tags[]", "tags"]);
    const seoKeywords = parseRepeatedOrJsonArray(req.body, ["meta.seoKeywords[]", "meta.seoKeywords", "seoKeywords[]", "seoKeywords"]);

    let readTime = blog.readTime;
    if (payload['meta.readTime']) readTime = Number(payload['meta.readTime']);
    else if (payload.readTime) readTime = Number(payload.readTime);

    let seoTitle = payload['meta.seoTitle'] || payload.seoTitle || blog.seoTitle;
    let seoDescription = payload['meta.seoDescription'] || payload.seoDescription || blog.seoDescription;
    
    if (payload.meta) {
        try {
            const metaObj = JSON.parse(payload.meta);
            if (metaObj.readTime) readTime = Number(metaObj.readTime);
            if (metaObj.seoTitle) seoTitle = metaObj.seoTitle;
            if (metaObj.seoDescription) seoDescription = metaObj.seoDescription;
        } catch(e) {}
    }

    blog.title = payload.title || blog.title;
    blog.content = payload.content || blog.content;
    blog.status = payload.status || blog.status;
    blog.thumbnail = thumbnail;
    if (categories.length > 0 || payload.categories) blog.categories = categories;
    if (tags.length > 0 || payload.tags) blog.tags = tags;
    blog.readTime = readTime;
    blog.seoTitle = seoTitle;
    blog.seoDescription = seoDescription;
    if (seoKeywords.length > 0 || payload.seoKeywords) blog.seoKeywords = seoKeywords;

    await blog.save();
    res.json(blog);
  } catch (error) {
    console.error("Error updating blog:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    if (blog.thumbnail) {
      const oldPath = path.join(__dirname, '../public', blog.thumbnail);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await Blog.findByIdAndDelete(id);
    res.json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

module.exports = router;
