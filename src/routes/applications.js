const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const auth = require('../middleware/auth');
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
    check('email').isEmail().withMessage('Please provide a valid email'),
    check('altContact').notEmpty().withMessage('Alternative contact method is required')
];

// POST /api/applications - Create a new application
router.post('/', upload.array('photos', 6), applicationValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            message: 'Please complete all required fields correctly.'
        });
    }

    if (!req.files || req.files.length < 2 || req.files.length > 6) {
        return res.status(400).json({ 
            success: false,
            message: 'Please upload between 2 and 6 photos.'
        });
    }

    try {
        // Check for duplicate applications in the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existingApplication = await Application.findOne({
            email: req.body.email.toLowerCase(),
            createdAt: { $gte: twentyFourHoursAgo }
        });

        if (existingApplication) {
            const hoursAgo = Math.floor((new Date() - existingApplication.createdAt) / (1000 * 60 * 60));
            const hoursLeft = 24 - hoursAgo;
            return res.status(429).json({
                success: false,
                message: `You have already submitted an application. Please wait ${hoursLeft} hour(s) before submitting again.`
            });
        }

        // Upload images to Cloudinary with fallback
        const photoUrls = [];
        for (const file of req.files) {
            try {
                const result = await cloudinary.uploader.upload(`data:${file.mimetype};base64,${file.buffer.toString('base64')}`, {
                    folder: 'beige_applications',
                    resource_type: 'image'
                });
                photoUrls.push(result.secure_url);
            } catch (uploadError) {
                console.warn('Cloudinary upload failed, using base64:', uploadError.message);
                // Fallback to base64
                photoUrls.push(`data:${file.mimetype};base64,${file.buffer.toString('base64')}`);
            }
        }

        // Create and save application
        const application = new Application({
            ...req.body,
            email: req.body.email.toLowerCase(),
            photos: photoUrls,
            status: 'pending'
        });

        await application.save();
        console.log(`✅ Application saved: ${application._id} - ${application.email}`);

        // Success response
        res.status(201).json({
            success: true,
            message: 'Application submitted successfully!',
            applicationId: application._id,
            data: {
                id: application._id,
                email: application.email,
                name: `${application.firstName} ${application.lastName}`,
                submittedAt: application.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Error saving application:', error);
        
        let errorMessage = 'Unable to process your application. Please try again.';
        
        if (error.name === 'ValidationError') {
            errorMessage = 'Please check your information and try again.';
        } else if (error.message.includes('duplicate')) {
            errorMessage = 'This email has already been used recently.';
        }
        
        res.status(500).json({ 
            success: false,
            message: errorMessage 
        });
    }
});

// GET /api/applications - Get all applications (Admin only)
router.get('/', auth, async (req, res) => {
    try {
        const applications = await Application.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: applications.length,
            data: applications
        });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ 
            success: false,
            message: 'Unable to fetch applications' 
        });
    }
});

// PUT /api/applications/:id - Update application status
router.put('/:id', auth, [
    check('status').isIn(['pending', 'reviewed', 'accepted', 'rejected']).withMessage('Invalid status')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            message: errors.array()[0].msg 
        });
    }

    try {
        const application = await Application.findByIdAndUpdate(
            req.params.id,
            { 
                status: req.body.status,
                updatedAt: new Date()
            },
            { new: true }
        );
        
        if (!application) {
            return res.status(404).json({ 
                success: false,
                message: 'Application not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Application updated successfully',
            data: application
        });
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({ 
            success: false,
            message: 'Unable to update application' 
        });
    }
});

// DELETE /api/applications/:id - Delete application
router.delete('/:id', auth, async (req, res) => {
    try {
        const application = await Application.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ 
                success: false,
                message: 'Application not found' 
            });
        }

        // Delete images from Cloudinary
        if (application.photos && application.photos.length > 0) {
            for (const photoUrl of application.photos) {
                try {
                    if (photoUrl.includes('cloudinary.com')) {
                        const parts = photoUrl.split('/');
                        const filename = parts[parts.length - 1];
                        const publicId = filename.split('.')[0];
                        await cloudinary.uploader.destroy(`beige_applications/${publicId}`);
                    }
                } catch (cloudinaryError) {
                    console.warn('Failed to delete Cloudinary image:', cloudinaryError);
                }
            }
        }

        await Application.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: 'Application deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({ 
            success: false,
            message: 'Unable to delete application' 
        });
    }
});

module.exports = router;
