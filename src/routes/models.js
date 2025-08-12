const express = require('express');
const router = express.Router();
const Model = require('../models/Model');
const auth = require('../middleware/auth'); // Consistent with lowercase middleware directory
const { query, body, validationResult } = require('express-validator');
const cloudinary = require('../config/cloudinary');
const upload = require('../middleware/multer');

// Public: Get all models with pagination
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100'),
    query('category')
      .optional()
      .isIn(['all', 'beauty', 'bridal', 'fashion', 'brand', 'makeup', 'Light Skin', 'Dark Skin', 'Caramel Skin', 'Brown Skin'])
      .withMessage('Invalid category'),
    query('name').optional().trim().isString().withMessage('Name must be a string')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { category, name, page = 1, limit = 6 } = req.query;
      const query = {};
      if (category && category !== 'all') query.category = category;
      if (name) query.name = { $regex: name, $options: 'i' };

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      if (isNaN(pageNum) || isNaN(limitNum)) {
        return res.status(400).json({ message: 'Invalid page or limit parameters' });
      }

      const skip = (pageNum - 1) * limitNum;
      const models = await Model.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);
      const total = await Model.countDocuments(query);

      res.json({ models, total });
    } catch (error) {
      console.error('Error fetching models:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Public: Get model by ID
router.get('/:id', async (req, res) => {
  try {
    const model = await Model.findById(req.params.id);
    if (!model) {
      return res.status(404).json({ message: 'Model not found' });
    }
    res.json(model);
  } catch (error) {
    console.error('Error fetching model by ID:', error);
    res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Add a model
router.post(
  '/',
  auth, // Fixed to use 'auth' instead of 'authMiddleware'
  upload.single('image'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('category').isIn(['beauty', 'bridal', 'fashion', 'brand', 'makeup', 'Light Skin', 'Dark Skin', 'Caramel Skin', 'Brown Skin']).withMessage('Invalid category'),
    body('height').optional().trim(),
    body('measurements').optional().trim(),
    body('hair').optional().trim(),
    body('eyes').optional().trim(),
    body('location').optional().trim(),
    body('description').optional().trim(),
    body('socialLinks').optional().isString().withMessage('Social links must be a valid JSON string'),
    body('socialLinks.instagram').optional().isURL().withMessage('Valid Instagram URL is required'),
    body('socialLinks.tiktok').optional().isURL().withMessage('Valid TikTok URL is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Main image is required' });
      }

      const { name, category, description, height, measurements, hair, eyes, location } = req.body;
      let socialLinks = req.body.socialLinks ? JSON.parse(req.body.socialLinks) : {};

      // Create base64 data URI
      const mimeType = req.file.mimetype; // e.g., 'image/jpeg'
      const base64Data = req.file.buffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64Data}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'models',
        resource_type: 'image',
        transformation: [{ width: 800, height: 800, crop: 'limit' }]
      });

      const model = new Model({
        name,
        category,
        imageUrl: result.secure_url,
        imagePublicId: result.public_id,
        description: description || undefined,
        height: height || undefined,
        measurements: measurements || undefined,
        hair: hair || undefined,
        eyes: eyes || undefined,
        location: location || undefined,
        socialLinks: {
          instagram: socialLinks.instagram || undefined,
          tiktok: socialLinks.tiktok || undefined
        }
      });

      await model.save();
      res.status(201).json(model);
    } catch (error) {
      console.error('Error adding model:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
);

// Admin: Update a model
router.put(
  '/:id',
  auth, // Fixed to use 'auth' instead of 'authMiddleware'
  upload.single('image'),
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('category').optional().isIn(['beauty', 'bridal', 'fashion', 'brand', 'makeup', 'Light Skin', 'Dark Skin', 'Caramel Skin', 'Brown Skin']).withMessage('Invalid category'),
    body('height').optional().trim(),
    body('measurements').optional().trim(),
    body('hair').optional().trim(),
    body('eyes').optional().trim(),
    body('location').optional().trim(),
    body('description').optional().trim(),
    body('socialLinks').optional().isString().withMessage('Social links must be a valid JSON string'),
    body('socialLinks.instagram').optional().isURL().withMessage('Valid Instagram URL is required'),
    body('socialLinks.tiktok').optional().isURL().withMessage('Valid TikTok URL is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, category, description, height, measurements, hair, eyes, location, imagePublicId } = req.body;
      let socialLinks = req.body.socialLinks ? JSON.parse(req.body.socialLinks) : {};

      const updateData = {
        name,
        category,
        description: description || undefined,
        height: height || undefined,
        measurements: measurements || undefined,
        hair: hair || undefined,
        eyes: eyes || undefined,
        location: location || undefined,
        socialLinks: {
          instagram: socialLinks.instagram || undefined,
          tiktok: socialLinks.tiktok || undefined
        }
      };

      if (req.file) {
        // Delete old image from Cloudinary if it exists
        if (imagePublicId) {
          await cloudinary.uploader.destroy(imagePublicId).catch(err => console.error('Error deleting old image:', err));
        }
        // Upload new image
        const mimeType = req.file.mimetype;
        const base64Data = req.file.buffer.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64Data}`;
        const result = await cloudinary.uploader.upload(dataUri, {
          folder: 'models',
          resource_type: 'image',
          transformation: [{ width: 800, height: 800, crop: 'limit' }]
        });
        updateData.imageUrl = result.secure_url;
        updateData.imagePublicId = result.public_id;
      }

      const model = await Model.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      if (!model) {
        return res.status(404).json({ message: 'Model not found' });
      }
      res.json(model);
    } catch (error) {
      console.error('Error updating model:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
);

// Admin: Add portfolio image
router.post(
  '/:id/portfolio',
  auth, // Fixed to use 'auth' instead of 'authMiddleware'
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Portfolio image is required' });
      }

      // Create base64 data URI
      const mimeType = req.file.mimetype;
      const base64Data = req.file.buffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64Data}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'models/portfolio',
        resource_type: 'image',
        transformation: [{ width: 800, height: 800, crop: 'limit' }]
      });

      const model = await Model.findByIdAndUpdate(
        req.params.id,
        { $push: { portfolioImages: { url: result.secure_url, public_id: result.public_id } } },
        { new: true, runValidators: true }
      );
      if (!model) {
        // Delete uploaded image if model not found
        await cloudinary.uploader.destroy(result.public_id).catch(err => console.error('Error deleting uploaded image:', err));
        return res.status(404).json({ message: 'Model not found' });
      }
      res.json(model);
    } catch (error) {
      console.error('Error adding portfolio image:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
);

// Admin: Delete portfolio image
router.delete(
  '/:id/portfolio/:imageIndex',
  auth, // Fixed to use 'auth' instead of 'authMiddleware'
  async (req, res) => {
    try {
      const model = await Model.findById(req.params.id);
      if (!model) {
        return res.status(404).json({ message: 'Model not found' });
      }
      const imageIndex = parseInt(req.params.imageIndex);
      if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= model.portfolioImages.length) {
        return res.status(400).json({ message: 'Invalid image index' });
      }
      const publicId = model.portfolioImages[imageIndex].public_id;
      if (publicId) {
        await cloudinary.uploader.destroy(publicId).catch(err => console.error('Error deleting portfolio image:', err));
      }
      model.portfolioImages.splice(imageIndex, 1);
      await model.save();
      res.json(model);
    } catch (error) {
      console.error('Error deleting portfolio image:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
);

// Admin: Delete a model
router.delete(
  '/:id',
  auth, // Fixed to use 'auth' instead of 'authMiddleware'
  async (req, res) => {
    try {
      const model = await Model.findById(req.params.id);
      if (!model) {
        return res.status(404).json({ message: 'Model not found' });
      }
      // Delete main image
      if (model.imagePublicId) {
        await cloudinary.uploader.destroy(model.imagePublicId).catch(err => console.error('Error deleting main image:', err));
      }
      // Delete portfolio images
      for (const image of model.portfolioImages) {
        if (image.public_id) {
          await cloudinary.uploader.destroy(image.public_id).catch(err => console.error('Error deleting portfolio image:', err));
        }
      }
      await Model.findByIdAndDelete(req.params.id);
      res.json({ message: 'Model deleted' });
    } catch (error) {
      console.error('Error deleting model:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
);

module.exports = router;
