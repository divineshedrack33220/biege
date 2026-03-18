const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    bust: { type: String, required: true },
    waist: { type: String, required: true },
    hips: { type: String, required: true },
    justCo: { type: String, required: true },
    height: { type: String, required: true },
    photos: [{ 
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^https:\/\/res\.cloudinary\.com\/.*$/.test(v);
            },
            message: props => `${props.value} is not a valid Cloudinary URL`
        }
    }],
    instagram: { type: String },
    tiktok: { type: String },
    location: { type: String, required: true },
    dob: { type: String, required: true },
    startDate: { type: String, required: true },
    email: { type: String, required: true },
    altContact: { type: String, required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
}, {
    validate: {
        validator: function(doc) {
            return Array.isArray(doc.photos) && doc.photos.length >= 2 && doc.photos.length <= 6;
        },
        message: 'Photos must be an array of 2 to 6 image URLs.'
    }
});

module.exports = mongoose.model('Application', applicationSchema);