const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const router = express.Router();

// Auto-create admin if it doesn't exist
const createInitialAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ email: 'arifursajid3456@gmail.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('blackclover6745', 10);
      await Admin.create({ email: 'arifursajid3456@gmail.com', password: hashedPassword });
      console.log('Initial admin created');
    }
  } catch (error) {
    console.error('Error creating initial admin:', error);
  }
};
createInitialAdmin();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, id: admin._id, email: admin.email, message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
