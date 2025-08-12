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
const aboutRoutes = require('./routes/about'); // must match exact file name

require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/models', modelRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api', aboutRoutes); // about & companies

// Static pages
const pages = [
    { route: ['/', '/index.html'], file: 'home.html' },
    { route: '/about.html', file: 'about.html' },
    { route: '/models.html', file: 'models.html' },
    { route: '/become-model.html', file: 'become-model.html' },
    { route: '/booking.html', file: 'booking.html' },
    { route: '/admin.html', file: 'admin.html' },
    { route: '/model.html', file: 'model.html' }
];
pages.forEach(p => {
    app.get(p.route, (req, res) => {
        res.sendFile(path.join(__dirname, '../public', p.file));
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
