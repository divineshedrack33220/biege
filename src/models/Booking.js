const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true }
});

const bookingSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  shootType: { type: String, required: true },
  modelDetails: { type: String, required: true },
  bookingDateTime: { type: Date, required: true },
  location: { type: locationSchema, required: true },
  contactMethod: { type: String, required: true },
  company: { type: String },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  revenue: { type: Number, required: true, default: 0 }, // New field for revenue
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);