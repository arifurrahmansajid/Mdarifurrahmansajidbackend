const express = require('express');
const { Resend } = require('resend');
const Message = require('../models/Message');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// GET - fetch all stored messages
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
});

// POST - send email AND save message to MongoDB
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required' });
    }

    // Save to MongoDB
    const saved = await Message.create({ name, email, subject: subject || '', message });

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: [process.env.TARGET_EMAIL],
      subject: subject || `New Message from ${name}`,
      html: `<p><strong>Name:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <p><strong>Subject:</strong> ${subject}</p>
             <p><strong>Message:</strong><br/>${message}</p>`
    });

    if (error) {
      console.warn('Resend error (message still saved):', error);
    }

    res.status(200).json({ message: 'Message received successfully', data: saved });
  } catch (error) {
    res.status(500).json({ message: 'Error processing message', error: error.message });
  }
});

// DELETE - delete a message by id
router.delete('/:id', async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting message', error: error.message });
  }
});

module.exports = router;
