const mongoose = require('mongoose');

const aboutSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'About text cannot exceed 500 characters']
  },
  contact: {
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters']
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?\d{10,15}$/, 'Please enter a valid phone number']
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, 'Please enter a valid email address']
    }
  },
  imageUrl: {
    type: String,
    trim: true
  },
  imagePublicId: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update `updatedAt` on save
aboutSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('About', aboutSchema);
