require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const adminRoutes = require('./routes/adminRoutes');
const emailRoutes = require('./routes/emailRoutes');
const blogRoutes = require('./routes/blogRoutes');
const projectRoutes = require('./routes/projectRoutes');

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    return callback(null, true); // Allow all origins
  },
  credentials: true,
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ─── MongoDB connection (cached across serverless invocations) ───────────────
let connectionPromise = null;

const connectDB = () => {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(); // Already connected
  }
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      })
      .then(() => {
        console.log('Connected to MongoDB Atlas');
      })
      .catch((err) => {
        console.error('MongoDB connection error:', err);
        connectionPromise = null; // Reset so it retries next request
        throw err;
      });
  }
  return connectionPromise;
};

// ─── DB middleware: ensure DB is ready before every API request ───────────────
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ error: 'Database unavailable', details: err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Portfolio Backend API is running 🚀',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/user', adminRoutes);
app.use('/api/message', emailRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/project', projectRoutes);

// ─── Local dev server ─────────────────────────────────────────────────────────
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  connectDB()
    .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
    .catch(err => console.error('Startup error:', err));
}

// ─── Export for Vercel serverless ─────────────────────────────────────────────
module.exports = app;
