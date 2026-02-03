const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  imageUrl: {
    type: String,
    trim: true,
  },
  imagePublicId: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  height: {
    type: String,
    trim: true,
  },
  bust: {
    type: String,
    trim: true,
  },
  waist: {
    type: String,
    trim: true,
  },
  hips: {
    type: String,
    trim: true,
  },
  hair: {
    type: String,
    trim: true,
  },
  eyes: {
    type: String,
    trim: true,
  },
  shoes: {
    type: String,
    trim: true,
  },
  modelSize: {
    type: String,
    trim: true,
  },
  placements: [
    {
      city: {
        type: String,
        trim: true,
      },
      agency: {
        type: String,
        trim: true,
      },
    },
  ],
  portfolioImages: [
    {
      url: {
        type: String,
        trim: true,
      },
      public_id: {
        type: String,
        trim: true,
      },
    },
  ],
  socialLinks: {
    instagram: {
      type: String,
      trim: true,
    },
    tiktok: {
      type: String,
      trim: true,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  indexes: [
    { key: { name: 1 } },
    { key: { category: 1 } },
  ],
});

module.exports = mongoose.model('Model', modelSchema);
