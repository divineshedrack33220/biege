const mongoose = require('mongoose');
const validator = require('validator');

const modelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['Light Skin', 'Dark Skin', 'Caramel Skin', 'Brown Skin'],
      message: 'Invalid category',
    },
    trim: true,
  },
  imageUrl: {
    type: String,
    required: [true, 'Main image is required'],
    trim: true,
    validate: {
      validator: (value) => validator.isURL(value),
      message: 'Invalid image URL',
    },
  },
  imagePublicId: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  height: {
    type: String,
    trim: true,
    maxlength: [20, 'Height cannot exceed 20 characters'],
  },
  bust: {
    type: String,
    trim: true,
    maxlength: [20, 'Bust measurement cannot exceed 20 characters'],
    validate: {
      validator: (value) => !value || /^\d+(\.\d+)?\s*cm$/.test(value),
      message: 'Bust must be a number followed by "cm" (e.g., 86 cm)',
    },
  },
  waist: {
    type: String,
    trim: true,
    maxlength: [20, 'Waist measurement cannot exceed 20 characters'],
    validate: {
      validator: (value) => !value || /^\d+(\.\d+)?\s*cm$/.test(value),
      message: 'Waist must be a number followed by "cm" (e.g., 61 cm)',
    },
  },
  hips: {
    type: String,
    trim: true,
    maxlength: [20, 'Hips measurement cannot exceed 20 characters'],
    validate: {
      validator: (value) => !value || /^\d+(\.\d+)?\s*cm$/.test(value),
      message: 'Hips must be a number followed by "cm" (e.g., 89 cm)',
    },
  },
  hair: {
    type: String,
    trim: true,
    maxlength: [50, 'Hair description cannot exceed 50 characters'],
  },
  eyes: {
    type: String,
    trim: true,
    maxlength: [50, 'Eyes description cannot exceed 50 characters'],
  },
  shoes: {
    type: String,
    trim: true,
    maxlength: [20, 'Shoes size cannot exceed 20 characters'],
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters'],
  },
  placements: [
    {
      city: {
        type: String,
        trim: true,
        maxlength: [100, 'City cannot exceed 100 characters'],
      },
      agency: {
        type: String,
        trim: true,
        maxlength: [100, 'Agency cannot exceed 100 characters'],
      },
    },
  ],
  portfolioImages: [
    {
      url: {
        type: String,
        required: [true, 'Portfolio image URL is required'],
        trim: true,
        validate: {
          validator: (value) => validator.isURL(value),
          message: 'Invalid portfolio image URL',
        },
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
      validate: {
        validator: (value) => !value || validator.isURL(value),
        message: 'Invalid Instagram URL',
      },
    },
    tiktok: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => !value || validator.isURL(value),
        message: 'Invalid TikTok URL',
      },
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
