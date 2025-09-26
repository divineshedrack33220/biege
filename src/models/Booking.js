const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true }
});

const bookingSchema = new mongoose.Schema({
  modelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Model', required: false },
  imageUrl: { type: String, required: false },
  modelName: { type: String, required: false },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  shootType: { type: String, required: true },
  bookingDateTime: { type: Date, required: true },
  location: { type: locationSchema, required: true },
  additionalNote: { type: String, required: false },
  contactMethod: {
    type: String,
    required: true,
    enum: ['whatsapp', 'call', 'email', 'instagram']
  },
  company: { type: String, required: false },
  revenue: { type: Number, required: false, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
