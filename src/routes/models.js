const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

// Validation middleware
const bookingValidation = [
  check('modelId').optional().isMongoId().withMessage('Invalid model ID'),
  check('imageUrl').optional().isURL().withMessage('Valid image URL is required'),
  check('modelName').optional().trim().isString().withMessage('Model name must be a string'),
  check('fullName').notEmpty().trim().isString().withMessage('Full name is required'),
  check('email').notEmpty().isEmail().normalizeEmail().withMessage('Valid email is required'),
  check('phone').notEmpty().matches(/\+?[0-9\s-()]{7,15}/).withMessage('Valid phone number is required (7-15 digits)'),
  check('shootType').notEmpty().isString().withMessage('Shoot type is required'),
  check('bookingDateTime').notEmpty().isISO8601().toDate().withMessage('Valid date/time is required'),
  check('location.address').notEmpty().trim().isString().withMessage('Address is required'),
  check('location.city').notEmpty().trim().isString().withMessage('City is required'),
  check('location.state').notEmpty().trim().isString().withMessage('State is required'),
  check('location.country').notEmpty().trim().isString().withMessage('Country is required'),
  check('contactMethod').notEmpty().isString().isIn(['whatsapp', 'call', 'email', 'instagram']).withMessage('Valid contact method is required'),
  check('additionalNote').optional().trim().isString().withMessage('Additional note must be a string')
];

// POST /api/bookings - Create a new booking
router.post('/', bookingValidation, async (req, res) => {
  console.log('Received req.body:', req.body); // Debug
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  try {
    const bookingData = {
      ...req.body,
      status: 'pending', // Ensure default status
      modelId: req.body.modelId || undefined, // Convert empty string to undefined
      imageUrl: req.body.imageUrl || undefined, // Convert empty string to undefined
      modelName: req.body.modelName || undefined, // Convert empty string to undefined
      additionalNote: req.body.additionalNote || undefined // Convert empty string to undefined
    };
    const booking = new Booking(bookingData);
    await booking.save();
    res.status(201).json({ message: 'Booking request submitted successfully' });
  } catch (error) {
    console.error('Error saving booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/bookings - Get all bookings (admin only)
router.get('/', auth, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/bookings/:id - Update booking status (admin only)
router.put('/:id', auth, [
  check('status').notEmpty().isString().isIn(['pending', 'reviewed', 'confirmed', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/bookings/:id - Delete a booking (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
