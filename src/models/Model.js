const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['beauty', 'bridal', 'fashion', 'brand', 'makeup', 'Light Skin', 'Dark Skin', 'Caramel Skin', 'Brown Skin'],
    trim: true
  },
  imageUrl: {
    type: String,
    required: true,
    trim: true
  },
  imagePublicId: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  height: {
    type: String,
    trim: true
  },
  measurements: {
    type: String,
    trim: true
  },
  hair: {
    type: String,
    trim: true
  },
  eyes: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  portfolioImages: [{
    url: { type: String, required: true, trim: true },
    public_id: { type: String, trim: true }
  }],
  socialLinks: {
    instagram: { type: String, trim: true },
    tiktok: { type: String, trim: true }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Model', modelSchema);