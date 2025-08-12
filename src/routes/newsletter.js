
const express = require('express');
const router = express.Router();
const Newsletter = require('../models/Newsletter');
const authMiddleware = require('../Middleware/auth');
const { body, validationResult } = require('express-validator');

// Public: Subscribe to newsletter
router.post(
  '/',
  [body('email').isEmail().withMessage('Valid email is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email } = req.body;
      const existingSubscriber = await Newsletter.findOne({ email });
      if (existingSubscriber) {
        return res.status(400).json({ message: 'Email already subscribed' });
      }

      const subscriber = new Newsletter({ email });
      await subscriber.save();
      res.status(201).json({ message: 'Subscribed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Admin: Get all subscribers
router.get('/', authMiddleware, async (req, res) => {
  try {
    const subscribers = await Newsletter.find();
    res.json(subscribers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
