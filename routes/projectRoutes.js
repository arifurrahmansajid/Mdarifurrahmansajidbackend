const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Project = require('../models/Project');

const uploadDirectory = process.env.VERCEL
  ? '/tmp/uploads'
  : path.join(__dirname, '../public/uploads');

try {
  if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create upload directory:', e.message);
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

// GET all projects
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const projects = await Project.find(query).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// GET single project by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// POST create project
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.title || !payload.description) {
      return res.status(400).json({ error: "Title and description are required" });
    }

    const thumbnail = req.file ? `/uploads/${req.file.filename}` : undefined;
    const features = parseRepeatedOrJsonArray(req.body, ["features"]);
    const technologies = parseRepeatedOrJsonArray(req.body, ["technologies"]);

    const project = new Project({
      title: payload.title,
      description: payload.description,
      thumbnail,
      status: payload.status || 'draft',
      features,
      technologies,
      githubLink: payload.githubLink || null,
      liveSite: payload.liveSite || null,
    });

    await project.save();
    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// PUT update project
router.put('/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const payload = req.body;
    let thumbnail = project.thumbnail;

    if (req.file) {
      if (project.thumbnail) {
        const oldPath = path.join(__dirname, '../public', project.thumbnail);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      thumbnail = `/uploads/${req.file.filename}`;
    }

    const features = parseRepeatedOrJsonArray(req.body, ["features"]);
    const technologies = parseRepeatedOrJsonArray(req.body, ["technologies"]);

    project.title = payload.title || project.title;
    project.description = payload.description || project.description;
    project.thumbnail = thumbnail;
    project.status = payload.status || project.status;
    project.githubLink = payload.githubLink || project.githubLink;
    project.liveSite = payload.liveSite || project.liveSite;
    if (features.length > 0 || payload.features) project.features = features;
    if (technologies.length > 0 || payload.technologies) project.technologies = technologies;

    await project.save();
    res.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// DELETE project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    if (project.thumbnail) {
      const oldPath = path.join(__dirname, '../public', project.thumbnail);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await Project.findByIdAndDelete(id);
    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

module.exports = router;
