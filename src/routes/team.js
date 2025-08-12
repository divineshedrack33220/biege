const express = require('express');
const router = express.Router();
const TeamMember = require('../models/TeamMember');
const auth = require('../middleware/auth'); // Consistent with lowercase middleware directory
const upload = require('../middleware/multer');
const cloudinary = require('../config/cloudinary');
const { body, validationResult } = require('express-validator');

// Public: Get all team members
router.get('/', async (req, res) => {
  try {
    const teamMembers = await TeamMember.find().sort({ createdAt: -1 });
    res.json(teamMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Add a team member
router.post(
  '/',
  auth, // Fixed to use 'auth' instead of 'authMiddleware'
  upload.single('image'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('role').notEmpty().withMessage('Role is required'),
    body('description').optional().trim()
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

      const { name, role, description } = req.body;

      // Create base64 data URI
      const mimeType = req.file.mimetype;
      const base64Data = req.file.buffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64Data}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'team',
        resource_type: 'image',
        transformation: [{ width: 800, height: 800, crop: 'limit' }]
      });

      const teamMember = new TeamMember({
        name,
        role,
        imageUrl: result.secure_url,
        imagePublicId: result.public_id,
        description: description || undefined
      });

      await teamMember.save();
      res.status(201).json(teamMember);
    } catch (error) {
      console.error('Error adding team member:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
);

// Admin: Update a team member
router.put(
  '/:id',
  auth, // Fixed to use 'auth' instead of 'authMiddleware'
  upload.single('image'),
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('role').optional().notEmpty().withMessage('Role cannot be empty'),
    body('description').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, role, description, imagePublicId } = req.body;
      const updateData = {
        name,
        role,
        description: description || undefined
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
          folder: 'team',
          resource_type: 'image',
          transformation: [{ width: 800, height: 800, crop: 'limit' }]
        });
        updateData.imageUrl = result.secure_url;
        updateData.imagePublicId = result.public_id;
      }

      const teamMember = await TeamMember.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      if (!teamMember) {
        return res.status(404).json({ message: 'Team member not found' });
      }
      res.json(teamMember);
    } catch (error) {
      console.error('Error updating team member:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
);

// Admin: Delete a team member
router.delete('/:id', auth, // Fixed to use 'auth' instead of 'authMiddleware'
  async (req, res) => {
    try {
      const teamMember = await TeamMember.findById(req.params.id);
      if (!teamMember) {
        return res.status(404).json({ message: 'Team member not found' });
      }
      if (teamMember.imagePublicId) {
        await cloudinary.uploader.destroy(teamMember.imagePublicId).catch(err => console.error('Error deleting image:', err));
      }
      await TeamMember.findByIdAndDelete(req.params.id);
      res.json({ message: 'Team member deleted' });
    } catch (error) {
      console.error('Error deleting team member:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
);

module.exports = router;
