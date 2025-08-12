const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const auth = require('../middleware/auth'); // Consistent with lowercase middleware directory
const { check, validationResult } = require('express-validator');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const path = require('path');

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only JPG and PNG files are allowed'));
    }
});

// Validation middleware for POST /api/applications
const applicationValidation = [
    check('firstName').notEmpty().withMessage('First name is required'),
    check('lastName').notEmpty().withMessage('Last name is required'),
    check('bust').notEmpty().withMessage('Bust measurement is required'),
    check('waist').notEmpty().withMessage('Waist measurement is required'),
    check('hips').notEmpty().withMessage('Hip measurement is required'),
    check('justCo').notEmpty().withMessage('Agency representation status is required'),
    check('height').notEmpty().withMessage('Height is required'),
    check('instagram').optional(),
    check('tiktok').optional(),
    check('location').notEmpty().withMessage('Location is required'),
    check('dob').notEmpty().withMessage('Date of birth is required'),
    check('startDate').notEmpty().withMessage('Start date is required'),
    check('email').notEmpty().withMessage('Email is required'),
    check('altContact').notEmpty().withMessage('Alternative contact method is required')
];

// POST /api/applications - Create a new application
router.post('/', upload.array('photos', 6), applicationValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ message: errors.array()[0].msg });
    }

    console.log('Received files:', req.files ? req.files.length : 0); // Debug log
    if (!req.files || req.files.length < 2 || req.files.length > 6) {
        console.log('Invalid number of files:', req.files ? req.files.length : 0);
        return res.status(400).json({ message: 'You must upload between 2 and 6 photos' });
    }

    try {
        // Upload images to Cloudinary
        const photoUrls = await Promise.all(
            req.files.map(async (file) => {
                try {
                    const result = await cloudinary.uploader.upload(`data:${file.mimetype};base64,${file.buffer.toString('base64')}`, {
                        folder: 'beige_applications',
                        resource_type: 'image'
                    });
                    console.log('Uploaded to Cloudinary:', result.secure_url); // Debug log
                    return result.secure_url;
                } catch (uploadError) {
                    console.error('Cloudinary upload error:', uploadError);
                    throw new Error(`Failed to upload ${file.originalname}: ${uploadError.message}`);
                }
            })
        );

        console.log('Photo URLs:', photoUrls); // Debug log

        const applicationData = {
            ...req.body,
            photos: photoUrls
        };

        console.log('Application data:', applicationData); // Debug log

        const application = new Application(applicationData);
        await application.save();
        console.log('Application saved successfully:', application._id);
        res.status(201).json({ message: 'Application submitted successfully' });
    } catch (error) {
        console.error('Error saving application:', error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

// GET, PUT, DELETE routes
router.get('/', auth, // Fixed to use 'auth' instead of 'authMiddleware'
  async (req, res) => {
    try {
        const applications = await Application.find().sort({ createdAt: -1 });
        res.json(applications);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/:id', auth, // Fixed to use 'auth' instead of 'authMiddleware'
  [
    check('status').isIn(['pending', 'reviewed', 'accepted', 'rejected']).withMessage('Invalid status')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
        const application = await Application.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }
        console.log('Application status updated:', application);
        res.json(application);
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/:id', auth, // Fixed to use 'auth' instead of 'authMiddleware'
  async (req, res) => {
    try {
        const application = await Application.findById(req.params.id);
        if (!application) {
            console.log('Application not found for ID:', req.params.id);
            return res.status(404).json({ message: 'Application not found' });
        }

        // Delete associated images from Cloudinary
        for (const photoUrl of application.photos) {
            const publicId = photoUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`beige_applications/${publicId}`);
        }

        await Application.findByIdAndDelete(req.params.id);
        console.log('Application deleted:', application);
        res.json({ message: 'Application deleted successfully' });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
