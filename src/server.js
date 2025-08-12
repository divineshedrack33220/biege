const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const modelRoutes = require('./routes/models');
const newsletterRoutes = require('./routes/newsletter');
const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/team');
const galleryRoutes = require('./routes/gallery');
const applicationRoutes = require('./routes/applications');
const bookingRoutes = require('./routes/bookings');
const aboutRoutes = require('./routes/about'); // Added for about and companies routes
require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/models', modelRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api', aboutRoutes); // Mount about.js for about and companies routes

// Serve static HTML files
app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../public/home.html'));
});
app.get('/about.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/about.html'));
});
app.get('/models.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/models.html'));
});
app.get('/become-model.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/become-model.html'));
});
app.get('/booking.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/booking.html'));
});
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});
app.get('/model.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/model.html'));
});

// Error handling for 404
app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});