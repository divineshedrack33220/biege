const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
require('dotenv').config();

// ✅ Configure Nodemailer with Elastic Email SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.elasticemail.com',
  port: 2525, // Elastic Email works with 2525 or 587
  auth: {
    user: process.env.ELASTIC_EMAIL_USERNAME, // must match verified sender
    pass: process.env.ELASTIC_EMAIL_PASSWORD
  }
});

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
  console.log('Received req.body:', req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  try {
    const bookingData = {
      ...req.body,
      status: 'pending',
      modelId: req.body.modelId || undefined,
      imageUrl: req.body.imageUrl || undefined,
      modelName: req.body.modelName || undefined,
      additionalNote: req.body.additionalNote || undefined
    };

    const booking = new Booking(bookingData);
    await booking.save();

    // ✅ Email notification
    const mailOptions = {
      from: process.env.ELASTIC_EMAIL_FROM, // must be your verified sender in Elastic Email
      to: 'a39345767@gmail.com', // where you receive bookings
      replyTo: req.body.email, // ✅ reply goes to customer
      subject: `New Booking Request - ${req.body.fullName}`,
      html: `
        <h2>New Booking Request</h2>
        <p><strong>Client Name:</strong> ${req.body.fullName}</p>
        <p><strong>Email:</strong> ${req.body.email}</p>
        <p><strong>Phone:</strong> ${req.body.phone}</p>
        <p><strong>Shoot Type:</strong> ${req.body.shootType}</p>
        <p><strong>Booking Date/Time:</strong> ${req.body.bookingDateTime}</p>
        <p><strong>Location:</strong> ${req.body.location.address}, ${req.body.location.city}, ${req.body.location.state}, ${req.body.location.country}</p>
        <p><strong>Contact Method:</strong> ${req.body.contactMethod}</p>
        <p><strong>Model ID:</strong> ${req.body.modelId || 'N/A'}</p>
        <p><strong>Model Name:</strong> ${req.body.modelName || 'N/A'}</p>
        <p><strong>Additional Note:</strong> ${req.body.additionalNote || 'N/A'}</p>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
      `,
      text: `
        New Booking Request
        -------------------
        Client Name: ${req.body.fullName}
        Email: ${req.body.email}
        Phone: ${req.body.phone}
        Shoot Type: ${req.body.shootType}
        Booking Date/Time: ${req.body.bookingDateTime}
        Location: ${req.body.location.address}, ${req.body.location.city}, ${req.body.location.state}, ${req.body.location.country}
        Contact Method: ${req.body.contactMethod}
        Model ID: ${req.body.modelId || 'N/A'}
        Model Name: ${req.body.modelName || 'N/A'}
        Additional Note: ${req.body.additionalNote || 'N/A'}
        Booking ID: ${booking._id}
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully via Elastic Email SMTP');

    res.status(201).json({ message: 'Booking request submitted successfully' });
  } catch (error) {
    console.error('❌ Error saving booking or sending email:', error);
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
