const express = require('express');
const router = express.Router();
const About = require('../models/about');
const Company = require('../models/company');
const auth = require('../middleware/auth');
const upload = require('../middleware/multer');
const cloudinary = require('../config/cloudinary');
const { body, validationResult } = require('express-validator');

// Public: Get About section
router.get('/about', async (req, res) => {
  try {
    const about = await About.findOne().lean();
    if (!about) {
      return res.json({ id: null, text: '' });
    }
    res.json({ id: about._id, text: about.text });
  } catch (error) {
    console.error('Error fetching about:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Update About section
router.put(
  '/about',
  auth,
  [
    body('text')
      .notEmpty().withMessage('About text is required')
      .trim()
      .isLength({ max: 500 }).withMessage('About text cannot exceed 500 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id, text } = req.body;
      let about;

      if (id) {
        about = await About.findByIdAndUpdate(id, { text }, { new: true, runValidators: true });
        if (!about) {
          return res.status(404).json({ message: 'About section not found' });
        }
      } else {
        about = new About({ text });
        await about.save();
      }

      res.json({ id: about._id, text: about.text });
    } catch (error) {
      console.error('Error updating about:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
);

// Public: Get all companies
router.get('/companies', async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 }).lean();
    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Add a company
router.post(
  '/companies',
  auth,
  upload.single('logo'),
  [
    body('name').notEmpty().withMessage('Company name is required'),
    body('link').optional().isURL().withMessage('Please enter a valid URL')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, link } = req.body;
      let logoUrl, logoPublicId;

      if (req.file) {
        const mimeType = req.file.mimetype;
        const base64Data = req.file.buffer.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64Data}`;
        const result = await cloudinary.uploader.upload(dataUri, {
          folder: 'companies',
          resource_type: 'image',
          transformation: [{ width: 200, height: 50, crop: 'limit' }]
        });
        logoUrl = result.secure_url;
        logoPublicId = result.public_id;
      }

      const company = new Company({
        name,
        logoUrl,
        logoPublicId,
        link: link || undefined
      });

      await company.save();
      res.status(201).json(company);
    } catch (error) {
      console.error('Error adding company:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
);

// Admin: Update a company
router.put(
  '/companies/:id',
  auth,
  upload.single('logo'),
  [
    body('name').optional().notEmpty().withMessage('Company name cannot be empty'),
    body('link').optional().isURL().withMessage('Please enter a valid URL')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, link, logoPublicId } = req.body;
      const updateData = { name, link: link || undefined };

      if (req.file) {
        if (logoPublicId) {
          await cloudinary.uploader.destroy(logoPublicId).catch(err => console.error('Error deleting old logo:', err));
        }
        const mimeType = req.file.mimetype;
        const base64Data = req.file.buffer.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64Data}`;
        const result = await cloudinary.uploader.upload(dataUri, {
          folder: 'companies',
          resource_type: 'image',
          transformation: [{ width: 200, height: 50, crop: 'limit' }]
        });
        updateData.logoUrl = result.secure_url;
        updateData.logoPublicId = result.public_id;
      }

      const company = await Company.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      res.json(company);
    } catch (error) {
      console.error('Error updating company:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
);

// Admin: Delete a company
router.delete('/companies/:id', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    if (company.logoPublicId) {
      await cloudinary.uploader.destroy(company.logoPublicId).catch(err => console.error('Error deleting logo:', err));
    }
    await Company.findByIdAndDelete(req.params.id);
    res.json({ message: 'Company deleted' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

module.exports = router;


