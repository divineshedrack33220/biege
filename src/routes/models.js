const express = require('express');
const router = express.Router();
const Model = require('../models/Model');
const auth = require('../middleware/auth');
const { query, body, validationResult, matchedData } = require('express-validator');
const cloudinary = require('../config/cloudinary');
const upload = require('../middleware/multer');
const mongoose = require('mongoose');

// Validation for measurements to enforce "number cm" format
const measurementValidation = (field) =>
  body(field)
    .optional()
    .trim()
    .matches(/^\d+(\.\d+)?\s*cm$/)
    .withMessage(`${field.split('.')[1]} must be a number followed by "cm" (e.g., 86 cm)`);

// Public: Get all models with pagination
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100'),
    query('category')
      .optional()
      .isIn(['all', 'Light Skin', 'Dark Skin', 'Caramel Skin', 'Brown Skin'])
      .withMessage('Invalid category'),
    query('name').optional().trim().isString().withMessage('Name must be a string'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { category, name, page = 1, limit = 6 } = matchedData(req);
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
        .limit(limitNum)
        .lean();
      const total = await Model.countDocuments(query);

      // Ensure socialLinks, location, and measurements are always included
      const modelsWithDefaults = models.map((model) => ({
        ...model,
        socialLinks: model.socialLinks || { instagram: null, tiktok: null },
        location: model.location || undefined,
        measurements: model.measurements
          ? {
              bust: model.measurements.bust || undefined,
              waist: model.measurements.waist || undefined,
              hips: model.measurements.hips || undefined,
            }
          : undefined,
      }));

      console.log('GET /api/models: Sending models:', modelsWithDefaults); // Debug log
      res.json({ models: modelsWithDefaults, total });
    } catch (error) {
      console.error('Error fetching models:', error.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Public: Get model by ID
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid model ID' });
    }
    const model = await Model.findById(req.params.id).lean();
    if (!model) {
      return res.status(404).json({ message: 'Model not found' });
    }
    // Ensure socialLinks, location, and measurements are always included
    const modelWithDefaults = {
      ...model,
      socialLinks: model.socialLinks || { instagram: null, tiktok: null },
      location: model.location || undefined,
      measurements: model.measurements
        ? {
            bust: model.measurements.bust || undefined,
            waist: model.measurements.waist || undefined,
            hips: model.measurements.hips || undefined,
          }
        : undefined,
    };
    console.log(`GET /api/models/${req.params.id}: Sending model:`, modelWithDefaults); // Debug log
    res.json(modelWithDefaults);
  } catch (error) {
    console.error('Error fetching model by ID:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Add a model
router.post(
  '/',
  auth,
  upload.single('image'),
  [
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('category')
      .isIn(['Light Skin', 'Dark Skin', 'Caramel Skin', 'Brown Skin'])
      .withMessage('Invalid category'),
    body('height')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Height cannot exceed 20 characters'),
    measurementValidation('measurements.bust'),
    measurementValidation('measurements.waist'),
    measurementValidation('measurements.hips'),
    body('hair')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Hair description cannot exceed 50 characters'),
    body('eyes')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Eyes description cannot exceed 50 characters'),
    body('shoes')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Shoes size cannot exceed 20 characters'),
    body('location')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Location cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    body('placements')
      .optional()
      .customSanitizer((value) => {
        try {
          return value ? JSON.parse(value) : [];
        } catch (error) {
          throw new Error('Placements must be a valid JSON array');
        }
      })
      .isArray()
      .withMessage('Placements must be an array'),
    body('placements.*.city')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('City cannot exceed 100 characters'),
    body('placements.*.agency')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Agency cannot exceed 100 characters'),
    body('socialLinks')
      .optional()
      .customSanitizer((value) => {
        try {
          return value ? JSON.parse(value) : { instagram: null, tiktok: null };
        } catch (error) {
          throw new Error('SocialLinks must be a valid JSON object');
        }
      }),
    body('socialLinks.instagram')
      .optional()
      .isURL()
      .withMessage('Valid Instagram URL is required'),
    body('socialLinks.tiktok')
      .optional()
      .isURL()
      .withMessage('Valid TikTok URL is required'),
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

      const data = matchedData(req);
      const { name, category, description, height, measurements, hair, eyes, shoes, location, placements, socialLinks } = data;

      // Upload main image to Cloudinary
      const mimeType = req.file.mimetype;
      const base64Data = req.file.buffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64Data}`;
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'models',
        resource_type: 'image',
        transformation: [{ width: 800, height: 800, crop: 'limit' }],
      });

      const modelData = {
        name,
        category,
        imageUrl: result.secure_url,
        imagePublicId: result.public_id,
        description: description || undefined,
        height: height || undefined,
        measurements: measurements && (measurements.bust || measurements.waist || measurements.hips)
          ? {
              bust: measurements.bust || undefined,
              waist: measurements.waist || undefined,
              hips: measurements.hips || undefined,
            }
          : undefined,
        hair: hair || undefined,
        eyes: eyes || undefined,
        shoes: shoes || undefined,
        location: location || undefined,
        placements: placements
          ? placements.map((p) => ({
              city: p.city || undefined,
              agency: p.agency || undefined,
            }))
          : [],
        socialLinks: {
          instagram: socialLinks?.instagram || undefined,
          tiktok: socialLinks?.tiktok || undefined,
        },
      };

      const model = new Model(modelData);
      await model.save();
      console.log('POST /api/models: Created model:', modelData); // Debug log
      res.status(201).json(model);
    } catch (error) {
      console.error('Error adding model:', error.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Admin: Update a model
router.put(
  '/:id',
  auth,
  upload.single('image'),
  [
    body('name')
      .optional()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('category')
      .optional()
      .isIn(['Light Skin', 'Dark Skin', 'Caramel Skin', 'Brown Skin'])
      .withMessage('Invalid category'),
    body('height')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Height cannot exceed 20 characters'),
    measurementValidation('measurements.bust'),
    measurementValidation('measurements.waist'),
    measurementValidation('measurements.hips'),
    body('hair')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Hair description cannot exceed 50 characters'),
    body('eyes')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Eyes description cannot exceed 50 characters'),
    body('shoes')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Shoes size cannot exceed 20 characters'),
    body('location')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Location cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    body('placements')
      .optional()
      .customSanitizer((value) => {
        try {
          return value ? JSON.parse(value) : [];
        } catch (error) {
          throw new Error('Placements must be a valid JSON array');
        }
      })
      .isArray()
      .withMessage('Placements must be an array'),
    body('placements.*.city')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('City cannot exceed 100 characters'),
    body('placements.*.agency')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Agency cannot exceed 100 characters'),
    body('socialLinks')
      .optional()
      .customSanitizer((value) => {
        try {
          return value ? JSON.parse(value) : { instagram: null, tiktok: null };
        } catch (error) {
          throw new Error('SocialLinks must be a valid JSON object');
        }
      }),
    body('socialLinks.instagram')
      .optional()
      .isURL()
      .withMessage('Valid Instagram URL is required'),
    body('socialLinks.tiktok')
      .optional()
      .isURL()
      .withMessage('Valid TikTok URL is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid model ID' });
      }

      const data = matchedData(req);
      const { name, category, description, height, measurements, hair, eyes, shoes, location, placements, socialLinks, imagePublicId } = data;

      const updateData = {
        name,
        category,
        description: description || undefined,
        height: height || undefined,
        measurements: measurements && (measurements.bust || measurements.waist || measurements.hips)
          ? {
              bust: measurements.bust || undefined,
              waist: measurements.waist || undefined,
              hips: measurements.hips || undefined,
            }
          : undefined,
        hair: hair || undefined,
        eyes: eyes || undefined,
        shoes: shoes || undefined,
        location: location || undefined,
        placements: placements
          ? placements.map((p) => ({
              city: p.city || undefined,
              agency: p.agency || undefined,
            }))
          : [],
        socialLinks: {
          instagram: socialLinks?.instagram || undefined,
          tiktok: socialLinks?.tiktok || undefined,
        },
      };

      if (req.file) {
        // Delete old image from Cloudinary if it exists
        if (imagePublicId) {
          await cloudinary.uploader.destroy(imagePublicId).catch((err) =>
            console.error('Error deleting old image:', err)
          );
        }
        // Upload new image
        const mimeType = req.file.mimetype;
        const base64Data = req.file.buffer.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64Data}`;
        const result = await cloudinary.uploader.upload(dataUri, {
          folder: 'models',
          resource_type: 'image',
          transformation: [{ width: 800, height: 800, crop: 'limit' }],
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
      // Ensure socialLinks, location, and measurements are always included in response
      const modelWithDefaults = {
        ...model.toObject(),
        socialLinks: model.socialLinks || { instagram: null, tiktok: null },
        location: model.location || undefined,
        measurements: model.measurements
          ? {
              bust: model.measurements.bust || undefined,
              waist: model.measurements.waist || undefined,
              hips: model.measurements.hips || undefined,
            }
          : undefined,
      };
      console.log(`PUT /api/models/${req.params.id}: Updated model:`, modelWithDefaults); // Debug log
      res.json(modelWithDefaults);
    } catch (error) {
      console.error('Error updating model:', error.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Admin: Add portfolio image
router.post(
  '/:id/portfolio',
  auth,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid model ID' });
      }
      if (!req.file) {
        return res.status(400).json({ message: 'Portfolio image is required' });
      }

      // Upload image to Cloudinary
      const mimeType = req.file.mimetype;
      const base64Data = req.file.buffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64Data}`;
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'models/portfolio',
        resource_type: 'image',
        transformation: [{ width: 800, height: 800, crop: 'limit' }],
      });

      const model = await Model.findByIdAndUpdate(
        req.params.id,
        { $push: { portfolioImages: { url: result.secure_url, public_id: result.public_id } } },
        { new: true, runValidators: true }
      );
      if (!model) {
        // Delete uploaded image if model not found
        await cloudinary.uploader.destroy(result.public_id).catch((err) =>
          console.error('Error deleting uploaded image:', err)
        );
        return res.status(404).json({ message: 'Model not found' });
      }
      // Ensure socialLinks, location, and measurements are always included in response
      const modelWithDefaults = {
        ...model.toObject(),
        socialLinks: model.socialLinks || { instagram: null, tiktok: null },
        location: model.location || undefined,
        measurements: model.measurements
          ? {
              bust: model.measurements.bust || undefined,
              waist: model.measurements.waist || undefined,
              hips: model.measurements.hips || undefined,
            }
          : undefined,
      };
      console.log(`POST /api/models/${req.params.id}/portfolio: Updated model:`, modelWithDefaults); // Debug log
      res.json(modelWithDefaults);
    } catch (error) {
      console.error('Error adding portfolio image:', error.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Admin: Delete portfolio image
router.delete(
  '/:id/portfolio/:imageIndex',
  auth,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid model ID' });
      }
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
        await cloudinary.uploader.destroy(publicId).catch((err) =>
          console.error('Error deleting portfolio image:', err)
        );
      }
      model.portfolioImages.splice(imageIndex, 1);
      await model.save();
      // Ensure socialLinks, location, and measurements are always included in response
      const modelWithDefaults = {
        ...model.toObject(),
        socialLinks: model.socialLinks || { instagram: null, tiktok: null },
        location: model.location || undefined,
        measurements: model.measurements
          ? {
              bust: model.measurements.bust || undefined,
              waist: model.measurements.waist || undefined,
              hips: model.measurements.hips || undefined,
            }
          : undefined,
      };
      console.log(`DELETE /api/models/${req.params.id}/portfolio/${imageIndex}: Updated model:`, modelWithDefaults); // Debug log
      res.json(modelWithDefaults);
    } catch (error) {
      console.error('Error deleting portfolio image:', error.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Admin: Delete a model
router.delete(
  '/:id',
  auth,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid model ID' });
      }
      const model = await Model.findById(req.params.id);
      if (!model) {
        return res.status(404).json({ message: 'Model not found' });
      }
      // Delete main image
      if (model.imagePublicId) {
        await cloudinary.uploader.destroy(model.imagePublicId).catch((err) =>
          console.error('Error deleting main image:', err)
        );
      }
      // Delete portfolio images
      for (const image of model.portfolioImages) {
        if (image.public_id) {
          await cloudinary.uploader.destroy(image.public_id).catch((err) =>
            console.error('Error deleting portfolio image:', err)
          );
        }
      }
      await Model.findByIdAndDelete(req.params.id);
      console.log(`DELETE /api/models/${req.params.id}: Model deleted`); // Debug log
      res.json({ message: 'Model deleted' });
    } catch (error) {
      console.error('Error deleting model:', error.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
