const express = require('express');
const router = express.Router();
const GalleryImage = require('../models/GalleryImage');
const auth = require('../middleware/auth'); // Consistent with lowercase middleware directory
const upload = require('../middleware/multer');
const cloudinary = require('../config/cloudinary');
const { body, validationResult } = require('express-validator');

// Public: Get all gallery images
router.get('/', async (req, res) => {
  try {
    const galleryImages = await GalleryImage.find().sort({ createdAt: -1 });
    res.json(galleryImages);
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Add a gallery image
router.post(
  '/',
  auth, // Fixed to use 'auth' instead of 'authMiddleware'
  upload.single('image'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('campaignLink').optional().isURL().withMessage('Valid campaign link is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Image is required' });
      }

      const { title, campaignLink } = req.body;

      // Create base64 data URI
      const mimeType = req.file.mimetype;
      const base64Data = req.file.buffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64Data}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'gallery',
        resource_type: 'image',
        transformation: [{ width: 800, height: 800, crop: 'limit' }]
      });

      const galleryImage = new GalleryImage({
        title,
        imageUrl: result.secure_url,
        imagePublicId: result.public_id,
        campaignLink: campaignLink || undefined
      });

      await galleryImage.save();
      res.status(201).json(galleryImage);
    } catch (error) {
      console.error('Error adding gallery image:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
);

// Admin: Update a gallery image
router.put(
  '/:id',
  auth, // Fixed to use 'auth' instead of 'authMiddleware'
  upload.single('image'),
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('campaignLink').optional().isURL().withMessage('Valid campaign link is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, campaignLink, imagePublicId } = req.body;
      const updateData = {
        title,
        campaignLink: campaignLink || undefined
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
          folder: 'gallery',
          resource_type: 'image',
          transformation: [{ width: 800, height: 800, crop: 'limit' }]
        });
        updateData.imageUrl = result.secure_url;
        updateData.imagePublicId = result.public_id;
      }

      const galleryImage = await GalleryImage.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      if (!galleryImage) {
        return res.status(404).json({ message: 'Gallery image not found' });
      }
      res.json(galleryImage);
    } catch (error) {
      console.error('Error updating gallery image:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
);

// Admin: Delete a gallery image
router.delete('/:id', auth, // Fixed to use 'auth' instead of 'authMiddleware'
  async (req, res) => {
    try {
      const galleryImage = await GalleryImage.findById(req.params.id);
      if (!galleryImage) {
        return res.status(404).json({ message: 'Gallery image not found' });
      }
      if (galleryImage.imagePublicId) {
        await cloudinary.uploader.destroy(galleryImage.imagePublicId).catch(err => console.error('Error deleting image:', err));
      }
      await GalleryImage.findByIdAndDelete(req.params.id);
      res.json({ message: 'Gallery image deleted' });
    } catch (error) {
      console.error('Error deleting gallery image:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
);

module.exports = router;
