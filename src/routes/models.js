const express = require('express');
const router = express.Router();
const Model = require('../models/Model');
const auth = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');
const upload = require('../middleware/multer');
const mongoose = require('mongoose');

// Public: Get all models with pagination
router.get('/', async (req, res) => {
  try {
    const { category, name, modelSize, page = 1, limit = 6 } = req.query;
    const query = {};
    if (category && category !== 'all') query.category = category;
    if (name) query.name = { $regex: name, $options: 'i' };
    if (modelSize) query.modelSize = { $regex: modelSize, $options: 'i' };

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

    // Ensure socialLinks, modelSize, bust, waist, hips are always included
    const modelsWithDefaults = models.map((model) => ({
      ...model,
      socialLinks: model.socialLinks || { instagram: null, tiktok: null },
      modelSize: model.modelSize || undefined,
      bust: model.bust || undefined,
      waist: model.waist || undefined,
      hips: model.hips || undefined,
    }));

    console.log('GET /api/models: Sending models:', modelsWithDefaults);
    res.json({ models: modelsWithDefaults, total });
  } catch (error) {
    console.error('Error fetching models:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

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
    const modelWithDefaults = {
      ...model,
      socialLinks: model.socialLinks || { instagram: null, tiktok: null },
      modelSize: model.modelSize || undefined,
      bust: model.bust || undefined,
      waist: model.waist || undefined,
      hips: model.hips || undefined,
    };
    console.log(`GET /api/models/${req.params.id}: Sending model:`, modelWithDefaults);
    res.json(modelWithDefaults);
  } catch (error) {
    console.error('Error fetching model by ID:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Add a model
router.post('/', auth, upload.single('image'), async (req, res) => {
  console.log('POST /api/models: Raw request body:', req.body);
  
  try {
    const {
      name,
      category,
      description,
      height,
      bust,
      waist,
      hips,
      hair,
      eyes,
      shoes,
      modelSize,
      placements = '[]',
      socialLinks = '{}',
      imagePublicId
    } = req.body;

    // Parse JSON fields
    let parsedPlacements = [];
    let parsedSocialLinks = {};
    
    try {
      parsedPlacements = placements ? JSON.parse(placements) : [];
    } catch (error) {
      console.error('Error parsing placements:', error);
    }
    
    try {
      parsedSocialLinks = socialLinks ? JSON.parse(socialLinks) : {};
    } catch (error) {
      console.error('Error parsing socialLinks:', error);
    }

    let imageUrl = '';
    let publicId = imagePublicId || '';

    // Upload image if provided
    if (req.file) {
      const mimeType = req.file.mimetype;
      const base64Data = req.file.buffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64Data}`;
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'models',
        resource_type: 'image',
        transformation: [{ width: 800, height: 800, crop: 'limit' }],
      });
      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    const modelData = {
      name: name || undefined,
      category: category || undefined,
      imageUrl: imageUrl || undefined,
      imagePublicId: publicId || undefined,
      description: description || undefined,
      height: height || undefined,
      bust: bust || undefined,
      waist: waist || undefined,
      hips: hips || undefined,
      hair: hair || undefined,
      eyes: eyes || undefined,
      shoes: shoes || undefined,
      modelSize: modelSize || undefined,
      placements: Array.isArray(parsedPlacements) ? parsedPlacements.map((p) => ({
        city: p.city || undefined,
        agency: p.agency || undefined,
      })) : [],
      socialLinks: {
        instagram: parsedSocialLinks.instagram || undefined,
        tiktok: parsedSocialLinks.tiktok || undefined,
      },
    };

    // Remove undefined values
    Object.keys(modelData).forEach(key => {
      if (modelData[key] === undefined) {
        delete modelData[key];
      }
    });

    const model = new Model(modelData);
    await model.save();
    console.log('POST /api/models: Created model:', modelData);
    res.status(201).json(model);
  } catch (error) {
    console.error('Error adding model:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Update a model
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  console.log('PUT /api/models/:id: Raw request body:', req.body);
  
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid model ID' });
    }

    const {
      name,
      category,
      description,
      height,
      bust,
      waist,
      hips,
      hair,
      eyes,
      shoes,
      modelSize,
      placements = '[]',
      socialLinks = '{}',
      imagePublicId
    } = req.body;

    // Parse JSON fields
    let parsedPlacements = [];
    let parsedSocialLinks = {};
    
    try {
      parsedPlacements = placements ? JSON.parse(placements) : [];
    } catch (error) {
      console.error('Error parsing placements:', error);
    }
    
    try {
      parsedSocialLinks = socialLinks ? JSON.parse(socialLinks) : {};
    } catch (error) {
      console.error('Error parsing socialLinks:', error);
    }

    const updateData = {
      name: name || undefined,
      category: category || undefined,
      description: description || undefined,
      height: height || undefined,
      bust: bust || undefined,
      waist: waist || undefined,
      hips: hips || undefined,
      hair: hair || undefined,
      eyes: eyes || undefined,
      shoes: shoes || undefined,
      modelSize: modelSize || undefined,
      placements: Array.isArray(parsedPlacements) ? parsedPlacements.map((p) => ({
        city: p.city || undefined,
        agency: p.agency || undefined,
      })) : [],
      socialLinks: {
        instagram: parsedSocialLinks.instagram || undefined,
        tiktok: parsedSocialLinks.tiktok || undefined,
      },
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Handle image upload if provided
    if (req.file) {
      // Delete old image if exists
      if (imagePublicId) {
        await cloudinary.uploader.destroy(imagePublicId).catch((err) =>
          console.error('Error deleting old image:', err)
        );
      }
      
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
      { new: true, runValidators: false } // IMPORTANT: runValidators: false
    );
    
    if (!model) {
      return res.status(404).json({ message: 'Model not found' });
    }
    
    const modelWithDefaults = {
      ...model.toObject(),
      socialLinks: model.socialLinks || { instagram: null, tiktok: null },
      modelSize: model.modelSize || undefined,
      bust: model.bust || undefined,
      waist: model.waist || undefined,
      hips: model.hips || undefined,
    };
    
    console.log(`PUT /api/models/${req.params.id}: Updated model:`, modelWithDefaults);
    res.json(modelWithDefaults);
  } catch (error) {
    console.error('Error updating model:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Add portfolio image
router.post('/:id/portfolio', auth, upload.single('image'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid model ID' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Portfolio image is required' });
    }

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
      { new: true, runValidators: false } // IMPORTANT: runValidators: false
    );
    
    if (!model) {
      await cloudinary.uploader.destroy(result.public_id).catch((err) =>
        console.error('Error deleting uploaded image:', err)
      );
      return res.status(404).json({ message: 'Model not found' });
    }
    
    const modelWithDefaults = {
      ...model.toObject(),
      socialLinks: model.socialLinks || { instagram: null, tiktok: null },
      modelSize: model.modelSize || undefined,
      bust: model.bust || undefined,
      waist: model.waist || undefined,
      hips: model.hips || undefined,
    };
    
    console.log(`POST /api/models/${req.params.id}/portfolio: Updated model:`, modelWithDefaults);
    res.json(modelWithDefaults);
  } catch (error) {
    console.error('Error adding portfolio image:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Delete portfolio image
router.delete('/:id/portfolio/:imageIndex', auth, async (req, res) => {
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
    const modelWithDefaults = {
      ...model.toObject(),
      socialLinks: model.socialLinks || { instagram: null, tiktok: null },
      modelSize: model.modelSize || undefined,
      bust: model.bust || undefined,
      waist: model.waist || undefined,
      hips: model.hips || undefined,
    };
    console.log(`DELETE /api/models/${req.params.id}/portfolio/${imageIndex}: Updated model:`, modelWithDefaults);
    res.json(modelWithDefaults);
  } catch (error) {
    console.error('Error deleting portfolio image:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Delete a model
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid model ID' });
    }
    const model = await Model.findById(req.params.id);
    if (!model) {
      return res.status(404).json({ message: 'Model not found' });
    }
    if (model.imagePublicId) {
      await cloudinary.uploader.destroy(model.imagePublicId).catch((err) =>
        console.error('Error deleting main image:', err)
      );
    }
    for (const image of model.portfolioImages) {
      if (image.public_id) {
        await cloudinary.uploader.destroy(image.public_id).catch((err) =>
          console.error('Error deleting portfolio image:', err)
        );
      }
    }
    await Model.findByIdAndDelete(req.params.id);
    console.log(`DELETE /api/models/${req.params.id}: Model deleted`);
    res.json({ message: 'Model deleted' });
  } catch (error) {
    console.error('Error deleting model:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
