const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth'); // If directory is lowercase

// Validation middleware
const bookingValidation = [
    check('fullName').notEmpty().trim().withMessage('Full name is required'),
    check('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    check('phone').matches(/\+?[0-9\s\-()]{7,15}/).withMessage('Valid phone number is required (7-15 digits)'),
    check('shootType').notEmpty().withMessage('Shoot type is required'),
    check('modelDetails').notEmpty().trim().withMessage('Model details are required'),
    check('bookingDateTime').isISO8601().toDate().withMessage('Valid date/time is required'),
    check('location.address').notEmpty().trim().withMessage('Address is required'),
    check('location.city').notEmpty().trim().withMessage('City is required'),
    check('location.state').notEmpty().trim().withMessage('State is required'),
    check('location.country').notEmpty().trim().withMessage('Country is required'),
    check('contactMethod').isIn(['whatsapp', 'call', 'email']).withMessage('Valid contact method is required')
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
            status: 'pending' // Ensure default status
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
router.get('/', authMiddleware, async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/bookings/:id - Update booking status (admin only)
router.put('/:id', authMiddleware, [
    check('status').isIn(['pending', 'reviewed', 'confirmed', 'cancelled']).withMessage('Invalid status')
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
router.delete('/:id', authMiddleware, async (req, res) => {
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
