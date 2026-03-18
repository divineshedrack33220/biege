// Load env first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Import routes
const modelRoutes = require('./routes/models');
const newsletterRoutes = require('./routes/newsletter');
const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/team');
const galleryRoutes = require('./routes/gallery');
const applicationRoutes = require('./routes/applications');
const bookingRoutes = require('./routes/bookings');
const aboutRoutes = require('./routes/about');
const telegramWebhookRoutes = require('./routes/telegramWebhook');

// Import cron jobs (optional)
try {
    require('./cron/dailySummary');
} catch (error) {
    console.log('⚠️ Cron jobs not loaded:', error.message);
}

const app = express();

// ✅ Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/models', modelRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api', aboutRoutes);
app.use('/api/telegram', telegramWebhookRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
            telegram: !!process.env.TELEGRAM_BOT_TOKEN,
            email: !!process.env.ELASTIC_EMAIL_USERNAME,
            database: 'connected'
        }
    });
});

// Static pages
const pages = [
    { route: ['/', '/index.html'], file: 'home.html' },
    { route: '/about.html', file: 'about.html' },
    { route: '/models.html', file: 'models.html' },
    { route: '/become-model.html', file: 'become-model.html' },
    { route: '/booking.html', file: 'booking.html' },
    { route: '/admin.html', file: 'admin.html' },
    { route: '/model.html', file: 'model.html' },
    { route: '/discount.html', file: 'discount.html' },
    { route: '/contact.html', file: 'contact.html' },
    { route: '/privacy.html', file: 'privacy.html' },
    { route: '/terms-of-service.html', file: 'terms-of-service.html' }
];

pages.forEach(p => {
    app.get(p.route, (req, res) => {
        res.sendFile(path.join(__dirname, '../public', p.file), (err) => {
            if (err) {
                console.error(`Error sending file ${p.file}:`, err.message);
                res.status(404).send('Page not found');
            }
        });
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false,
        message: 'API endpoint not found' 
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({ 
        success: false,
        message: 'Internal server error' 
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 ==================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('🚀 ==================================\n');
    
    console.log('📱 Services Status:');
    console.log(`   ├─ Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? '✅' : '❌'}`);
    console.log(`   ├─ Email: ${process.env.ELASTIC_EMAIL_USERNAME ? '✅' : '❌'}`);
    console.log(`   └─ Database: Connected ✅\n`);
    
    console.log('📝 Endpoints:');
    console.log(`   ├─ API: http://localhost:${PORT}/api`);
    console.log(`   ├─ Health: http://localhost:${PORT}/api/health`);
    console.log(`   └─ Web: http://localhost:${PORT}\n`);
});