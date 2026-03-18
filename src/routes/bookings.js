const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const telegramService = require('../services/telegramService');
require('dotenv').config();

// Create email transporter with proper configuration
let transporter = null;

// Initialize email transporter if credentials exist
if (process.env.ELASTIC_EMAIL_USERNAME && process.env.ELASTIC_EMAIL_PASSWORD) {
  try {
    transporter = nodemailer.createTransport({
      host: 'smtp.elasticemail.com',
      port: 2525,
      secure: false,
      auth: {
        user: process.env.ELASTIC_EMAIL_USERNAME,
        pass: process.env.ELASTIC_EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      },
      debug: true // Enable debug logs
    });

    // Verify connection
    transporter.verify((error, success) => {
      if (error) {
        console.log('❌ Email server connection error:', error.message);
        transporter = null;
      } else {
        console.log('✅ Email server is ready to send messages');
      }
    });
  } catch (error) {
    console.log('❌ Failed to create email transporter:', error.message);
    transporter = null;
  }
} else {
  console.log('⚠️ Email credentials not configured - email notifications disabled');
}

// Validation chain
const bookingValidation = [
  check('fullName').notEmpty().trim().withMessage('Full name is required'),
  check('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  check('phone').notEmpty().trim().withMessage('Phone number is required'),
  check('shootType').notEmpty().trim().withMessage('Shoot type is required'),
  check('bookingDateTime').isISO8601().withMessage('Valid date and time required'),
  check('location.address').notEmpty().trim().withMessage('Address is required'),
  check('location.city').notEmpty().trim().withMessage('City is required'),
  check('location.state').notEmpty().trim().withMessage('State is required'),
  check('location.country').notEmpty().trim().withMessage('Country is required'),
  check('contactMethod')
    .isIn(['whatsapp', 'call', 'email', 'instagram'])
    .withMessage('Valid contact method required'),
  check('modelId').optional().isMongoId().withMessage('Invalid model ID'),
  check('imageUrl').optional().isURL({ require_tld: false }).withMessage('Invalid image URL'),
  check('modelName').optional().trim(),
  check('additionalNote').optional().trim()
];

// CREATE Booking
router.post('/', bookingValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  try {
    // Create booking object
    const bookingData = {
      modelId: req.body.modelId || null,
      imageUrl: req.body.imageUrl || null,
      modelName: req.body.modelName || null,
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      shootType: req.body.shootType,
      bookingDateTime: req.body.bookingDateTime,
      location: req.body.location,
      additionalNote: req.body.additionalNote || null,
      contactMethod: req.body.contactMethod,
      status: 'pending',
      createdAt: new Date()
    };

    const booking = new Booking(bookingData);
    await booking.save();
    console.log('✅ Booking saved to database:', booking._id);

    // Send Telegram notification (non-blocking)
    telegramService.sendBookingNotification(booking)
      .then(sent => {
        if (sent) {
          console.log('✅ Telegram notification sent for booking:', booking._id);
        }
      })
      .catch(err => {
        console.error('❌ Telegram notification failed:', err.message);
      });

    // Send email notification if transporter is available
    if (transporter) {
      try {
        const mailOptions = {
          from: `"Beige Models" <${process.env.ELASTIC_EMAIL_FROM || 'notifications@beigemodels.org'}>`,
          to: 'a39345767@gmail.com',
          replyTo: req.body.email,
          subject: `📸 New Booking Request - ${req.body.fullName}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #000; color: #fff; padding: 20px; text-align: center; }
                .content { padding: 20px; border: 1px solid #ddd; }
                .field { margin-bottom: 15px; }
                .label { font-weight: bold; color: #666; }
                .value { margin-top: 5px; }
                .footer { margin-top: 20px; padding: 20px; text-align: center; color: #999; font-size: 12px; }
                hr { border: none; border-top: 1px solid #eee; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ New Booking Request</h1>
                </div>
                <div class="content">
                  <div class="field">
                    <div class="label">👤 Client Name</div>
                    <div class="value">${escapeHtml(req.body.fullName)}</div>
                  </div>
                  <hr>
                  
                  <div class="field">
                    <div class="label">📧 Email</div>
                    <div class="value">${escapeHtml(req.body.email)}</div>
                  </div>
                  <hr>
                  
                  <div class="field">
                    <div class="label">📞 Phone</div>
                    <div class="value">${escapeHtml(req.body.phone)}</div>
                  </div>
                  <hr>
                  
                  <div class="field">
                    <div class="label">📸 Shoot Type</div>
                    <div class="value">${escapeHtml(req.body.shootType)}</div>
                  </div>
                  <hr>
                  
                  <div class="field">
                    <div class="label">📅 Date & Time</div>
                    <div class="value">${new Date(req.body.bookingDateTime).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</div>
                  </div>
                  <hr>
                  
                  <div class="field">
                    <div class="label">📍 Location</div>
                    <div class="value">
                      ${escapeHtml(req.body.location.address)}<br>
                      ${escapeHtml(req.body.location.city)}, ${escapeHtml(req.body.location.state)}<br>
                      ${escapeHtml(req.body.location.country)}
                    </div>
                  </div>
                  <hr>
                  
                  <div class="field">
                    <div class="label">📱 Preferred Contact Method</div>
                    <div class="value">${escapeHtml(req.body.contactMethod).toUpperCase()}</div>
                  </div>
                  
                  ${req.body.modelName ? `
                  <hr>
                  <div class="field">
                    <div class="label">👤 Selected Model</div>
                    <div class="value">${escapeHtml(req.body.modelName)}</div>
                  </div>
                  ` : ''}
                  
                  ${req.body.additionalNote ? `
                  <hr>
                  <div class="field">
                    <div class="label">📝 Additional Notes</div>
                    <div class="value">${escapeHtml(req.body.additionalNote)}</div>
                  </div>
                  ` : ''}
                  
                  <hr>
                  <div class="field">
                    <div class="label">🆔 Booking ID</div>
                    <div class="value"><code>${booking._id}</code></div>
                  </div>
                </div>
                <div class="footer">
                  <p>This booking was submitted on ${new Date().toLocaleString()}</p>
                  <p>© ${new Date().getFullYear()} Beige Models. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Email notification sent for booking:', booking._id);
      } catch (emailError) {
        console.error('❌ Email sending failed (booking still saved):', emailError.message);
      }
    } else {
      console.log('📧 Email not sent - transporter not available');
    }

    // Send success response
    res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully! We will contact you soon.',
      bookingId: booking._id
    });

  } catch (error) {
    console.error('❌ Booking error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.' 
    });
  }
});

// GET all bookings (Admin)
router.get('/', auth, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// GET single booking (Admin)
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }
    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('❌ Error fetching booking:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// UPDATE status (Admin)
router.put('/:id', auth, [
  check('status').isIn(['pending', 'reviewed', 'confirmed', 'cancelled'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid status' 
    });
  }

  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { 
        status: req.body.status,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }
    
    // Send Telegram status update (non-blocking)
    telegramService.sendStatusUpdate(booking._id, booking.status, req.body.updatedBy || 'Admin')
      .catch(err => console.error('Telegram status update failed:', err.message));
    
    console.log(`✅ Booking ${booking._id} status updated to: ${booking.status}`);
    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('❌ Error updating booking:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// UPDATE revenue (Admin)
router.put('/:id/revenue', auth, [
  check('revenue').isNumeric().withMessage('Revenue must be a number')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid revenue value' 
    });
  }

  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { 
        revenue: req.body.revenue,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }
    
    // Send Telegram notification about revenue
    telegramService.sendMessage(
      process.env.TELEGRAM_CHAT_ID,
      `💰 <b>Revenue Updated</b>\n\nBooking: <code>${booking._id}</code>\nClient: ${booking.fullName}\nAmount: $${req.body.revenue}`,
      { parse_mode: 'HTML' }
    ).catch(err => console.error('Telegram revenue update failed:', err.message));
    
    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('❌ Error updating revenue:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// DELETE booking (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }
    
    // Send Telegram notification
    telegramService.sendMessage(
      process.env.TELEGRAM_CHAT_ID,
      `🗑️ <b>Booking Deleted</b>\n\nID: <code>${booking._id}</code>\nClient: ${booking.fullName}`,
      { parse_mode: 'HTML' }
    ).catch(err => console.error('Telegram delete notification failed:', err.message));
    
    res.json({ 
      success: true,
      message: 'Booking deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting booking:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// GET daily summary (Admin)
router.get('/summary/daily', auth, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: -1 });

    const summary = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      reviewed: bookings.filter(b => b.status === 'reviewed').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      revenue: bookings.reduce((sum, b) => sum + (b.revenue || 0), 0),
      bookings: bookings.map(b => ({
        id: b._id,
        client: b.fullName,
        type: b.shootType,
        status: b.status,
        date: b.bookingDateTime
      }))
    };

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('❌ Error generating summary:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

module.exports = router;