
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

// Login route
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { username, password } = req.body;
    console.log('Login attempt:', { username, password }); // Debug log

    try {
      const admin = await Admin.findOne({ username });
      if (!admin) {
        console.log('Admin not found for username:', username);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      console.log('Admin found:', admin);

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        console.log('Password mismatch for username:', username);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      console.log('Password matched for username:', username);

      const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });
      console.log('Token generated for admin:', admin._id);

      res.json({ token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
