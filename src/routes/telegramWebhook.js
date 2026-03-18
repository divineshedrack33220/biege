const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const telegramService = require('../services/telegramService');
const axios = require('axios');

// Handle Telegram webhook callbacks
router.post('/webhook', async (req, res) => {
    try {
        console.log('📩 Received Telegram webhook');
        console.log('🔍 Webhook body:', JSON.stringify(req.body, null, 2));
        
        const { callback_query, message } = req.body;
        
        // Handle callback queries (button clicks)
        if (callback_query) {
            console.log('🎯 Processing callback query');
            const { data, from, id: callbackId, message: callbackMessage } = callback_query;
            console.log(`👆 Button data: ${data}`);
            console.log(`👆 From: ${from.first_name} (ID: ${from.id})`);
            console.log(`👆 Chat ID: ${callbackMessage.chat.id}`);
            
            const [action, bookingId] = data.split('_');
            
            console.log(`👆 Action: ${action}, BookingID: ${bookingId}`);
            
            let responseText = '';
            let booking = null;

            // Get booking details
            if (bookingId && bookingId.length > 10) {
                try {
                    booking = await Booking.findById(bookingId);
                    if (booking) {
                        console.log(`📋 Found booking for: ${booking.fullName}`);
                        console.log(`📋 Booking status: ${booking.status}`);
                    } else {
                        console.log(`❌ Booking not found: ${bookingId}`);
                    }
                } catch (err) {
                    console.error('❌ Error finding booking:', err.message);
                }
            } else {
                console.log('❌ Invalid booking ID format:', bookingId);
            }

            // Process different actions
            switch(action) {
                case 'confirm':
                    if (booking) {
                        booking.status = 'confirmed';
                        await booking.save();
                        responseText = `✅ Booking #${bookingId.slice(-6)} has been CONFIRMED!`;
                        
                        // Send confirmation message to chat
                        await telegramService.sendMessage(
                            callbackMessage.chat.id,
                            `✅ <b>Booking Confirmed</b>\n\n` +
                            `👤 Client: ${booking.fullName}\n` +
                            `📸 Shoot: ${booking.shootType}\n` +
                            `📅 Date: ${new Date(booking.bookingDateTime).toLocaleString()}`,
                            { parse_mode: 'HTML' }
                        );
                        
                        console.log(`✅ Booking ${bookingId} confirmed`);
                    } else {
                        responseText = `❌ Booking not found`;
                    }
                    break;

                case 'review':
                    if (booking) {
                        booking.status = 'reviewed';
                        await booking.save();
                        responseText = `👀 Booking #${bookingId.slice(-6)} marked as REVIEWED`;
                        console.log(`👀 Booking ${bookingId} marked as reviewed`);
                    } else {
                        responseText = `❌ Booking not found`;
                    }
                    break;

                case 'cancel':
                    if (booking) {
                        booking.status = 'cancelled';
                        await booking.save();
                        responseText = `❌ Booking #${bookingId.slice(-6)} has been CANCELLED`;
                        console.log(`❌ Booking ${bookingId} cancelled`);
                    } else {
                        responseText = `❌ Booking not found`;
                    }
                    break;

                case 'details':
                    if (booking) {
                        const details = telegramService.formatBookingMessage(booking);
                        await telegramService.sendMessage(callbackMessage.chat.id, details, { parse_mode: 'HTML' });
                        responseText = `📋 Details sent for booking #${bookingId.slice(-6)}`;
                        console.log(`📋 Details sent for booking ${bookingId}`);
                    } else {
                        responseText = `❌ Booking not found`;
                    }
                    break;

                case 'contact':
                    if (booking) {
                        responseText = `📧 Contact Info:\n` +
                            `Name: ${booking.fullName}\n` +
                            `Email: ${booking.email}\n` +
                            `Phone: ${booking.phone}`;
                        console.log(`📧 Contact info sent for booking ${bookingId}`);
                    } else {
                        responseText = `❌ Booking not found`;
                    }
                    break;

                case 'calendar':
                    if (booking) {
                        const date = new Date(booking.bookingDateTime);
                        const endDate = new Date(date.getTime() + 2 * 60 * 60 * 1000); // +2 hours
                        
                        const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE` +
                            `&text=Photoshoot%20-%20${encodeURIComponent(booking.fullName)}` +
                            `&dates=${date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}` +
                            `/${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}` +
                            `&details=${encodeURIComponent(booking.additionalNote || 'Photoshoot booking')}` +
                            `&location=${encodeURIComponent(`${booking.location.address}, ${booking.location.city}`)}`;
                        
                        await telegramService.sendMessage(
                            callbackMessage.chat.id, 
                            `📅 <a href="${googleCalendarUrl}">Click here to add to Google Calendar</a>`, 
                            { parse_mode: 'HTML', disable_web_page_preview: false }
                        );
                        responseText = `📅 Calendar link sent`;
                        console.log(`📅 Calendar link sent for booking ${bookingId}`);
                    } else {
                        responseText = `❌ Booking not found`;
                    }
                    break;

                case 'revenue':
                    responseText = `💰 To set revenue, please use the admin panel at your website.`;
                    break;

                case 'model_photo':
                    if (booking) {
                        const sent = await telegramService.sendModelPhotoById(bookingId, callbackMessage.chat.id);
                        responseText = sent ? '📸 Model photo sent!' : '❌ Could not send model photo';
                        console.log(`📸 Model photo request handled for booking ${bookingId}: ${sent ? 'sent' : 'failed'}`);
                    } else {
                        responseText = '❌ Booking not found';
                    }
                    break;

                default:
                    responseText = 'Unknown action';
                    console.log(`❓ Unknown action: ${action}`);
            }

            // Answer callback query to remove loading state
            if (responseText) {
                try {
                    const answerUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
                    console.log(`📤 Sending callback answer: ${responseText}`);
                    
                    const answerResponse = await axios.post(answerUrl, {
                        callback_query_id: callbackId,
                        text: responseText,
                        show_alert: false
                    });
                    
                    console.log(`✅ Callback answered successfully:`, answerResponse.data);
                } catch (err) {
                    console.error('❌ Failed to answer callback:', err.response?.data || err.message);
                    if (err.response) {
                        console.error('Status:', err.response.status);
                        console.error('Headers:', err.response.headers);
                    }
                }
            }
        }

        // Handle regular messages (commands)
        if (message && message.text) {
            console.log('💬 Processing message');
            const chatId = message.chat.id;
            const text = message.text.toLowerCase();
            const from = message.from;

            console.log(`📨 Message from ${from.first_name} (${from.username || 'no username'}): ${text}`);

            // Simple commands
            if (text === '/start') {
                await telegramService.sendMessage(chatId, 
                    '👋 <b>Welcome to Beige Models Booking Bot!</b>\n\n' +
                    'You will receive notifications for new bookings.\n\n' +
                    '📋 <b>Available Commands:</b>\n' +
                    '/help - Show this message\n' +
                    '/stats - Show today\'s statistics\n' +
                    '/recent - Show recent bookings\n' +
                    '/pending - Show pending bookings',
                    { parse_mode: 'HTML' }
                );
                console.log('✅ Sent welcome message');
            } 
            else if (text === '/help') {
                await telegramService.sendMessage(chatId, 
                    '📋 <b>Available Commands:</b>\n\n' +
                    '/start - Welcome message\n' +
                    '/help - Show this help\n' +
                    '/stats - Today\'s statistics\n' +
                    '/recent - Last 5 bookings\n' +
                    '/pending - All pending bookings',
                    { parse_mode: 'HTML' }
                );
            } 
            else if (text === '/stats') {
                try {
                    const startOfDay = new Date();
                    startOfDay.setHours(0, 0, 0, 0);
                    
                    const bookings = await Booking.find({
                        createdAt: { $gte: startOfDay }
                    });
                    
                    const bookingsArray = Array.isArray(bookings) ? bookings : [];
                    
                    const stats = {
                        total: bookingsArray.length,
                        pending: bookingsArray.filter(b => b && b.status === 'pending').length,
                        reviewed: bookingsArray.filter(b => b && b.status === 'reviewed').length,
                        confirmed: bookingsArray.filter(b => b && b.status === 'confirmed').length,
                        cancelled: bookingsArray.filter(b => b && b.status === 'cancelled').length,
                        revenue: bookingsArray.reduce((sum, b) => sum + (b?.revenue || 0), 0)
                    };

                    await telegramService.sendMessage(chatId,
                        `📊 <b>Today's Statistics</b>\n\n` +
                        `Total Bookings: ${stats.total}\n` +
                        `├─ Pending: ${stats.pending}\n` +
                        `├─ Reviewed: ${stats.reviewed}\n` +
                        `├─ Confirmed: ${stats.confirmed}\n` +
                        `├─ Cancelled: ${stats.cancelled}\n` +
                        `└─ Revenue: $${stats.revenue}`,
                        { parse_mode: 'HTML' }
                    );
                    console.log('✅ Sent statistics');
                } catch (error) {
                    console.error('❌ Error in /stats command:', error);
                    await telegramService.sendMessage(chatId, '❌ Error fetching statistics. Please try again later.');
                }
            } 
            else if (text === '/recent') {
                try {
                    const bookings = await Booking.find()
                        .sort({ createdAt: -1 })
                        .limit(5);
                    
                    const bookingsArray = Array.isArray(bookings) ? bookings : [];

                    if (bookingsArray.length === 0) {
                        await telegramService.sendMessage(chatId, 'No recent bookings.');
                    } else {
                        let msg = '📋 <b>Recent Bookings</b>\n\n';
                        bookingsArray.forEach((b, i) => {
                            if (b) {
                                const date = b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'Unknown date';
                                msg += `${i+1}. <b>${b.fullName || 'Unknown'}</b>\n`;
                                msg += `   ├─ Type: ${b.shootType || 'N/A'}\n`;
                                msg += `   ├─ Date: ${date}\n`;
                                msg += `   └─ Status: ${b.status || 'N/A'}\n\n`;
                            }
                        });
                        await telegramService.sendMessage(chatId, msg, { parse_mode: 'HTML' });
                    }
                    console.log('✅ Sent recent bookings');
                } catch (error) {
                    console.error('❌ Error in /recent command:', error);
                    await telegramService.sendMessage(chatId, '❌ Error fetching recent bookings. Please try again later.');
                }
            } 
            else if (text === '/pending') {
                try {
                    const bookings = await Booking.find({ status: 'pending' })
                        .sort({ createdAt: -1 });
                    
                    const bookingsArray = Array.isArray(bookings) ? bookings : [];

                    if (bookingsArray.length === 0) {
                        await telegramService.sendMessage(chatId, 'No pending bookings. 🎉');
                    } else {
                        let msg = `⏳ <b>Pending Bookings (${bookingsArray.length})</b>\n\n`;
                        bookingsArray.slice(0, 5).forEach((b, i) => {
                            if (b) {
                                const date = b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'Unknown date';
                                msg += `${i+1}. <b>${b.fullName || 'Unknown'}</b>\n`;
                                msg += `   ├─ Type: ${b.shootType || 'N/A'}\n`;
                                msg += `   ├─ Date: ${date}\n`;
                                msg += `   └─ Status: ${b.status || 'N/A'}\n\n`;
                            }
                        });
                        if (bookingsArray.length > 5) {
                            msg += `... and ${bookingsArray.length - 5} more pending bookings`;
                        }
                        await telegramService.sendMessage(chatId, msg, { parse_mode: 'HTML' });
                    }
                    console.log('✅ Sent pending bookings');
                } catch (error) {
                    console.error('❌ Error in /pending command:', error);
                    await telegramService.sendMessage(chatId, '❌ Error fetching pending bookings. Please try again later.');
                }
            }
        }

        // Always return 200 OK to Telegram
        res.sendStatus(200);
        
    } catch (error) {
        console.error('❌ Telegram webhook error:', error);
        // Still return 200 to prevent Telegram from retrying
        res.sendStatus(200);
    }
});

// Set webhook URL
router.post('/set-webhook', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const webhookUrl = `${url.replace(/\/$/, '')}/api/telegram/webhook`;
        
        console.log('🔧 Setting webhook to:', webhookUrl);
        
        const response = await axios.post(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`,
            { 
                url: webhookUrl,
                allowed_updates: ['message', 'callback_query']
            }
        );
        
        console.log('✅ Webhook set response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('❌ Error setting webhook:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to set webhook',
            details: error.response?.data || error.message
        });
    }
});

// Get webhook info
router.get('/webhook-info', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`
        );
        
        console.log('📊 Webhook info:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('❌ Error getting webhook info:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to get webhook info',
            details: error.response?.data || error.message
        });
    }
});

// Remove webhook
router.post('/remove-webhook', async (req, res) => {
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/deleteWebhook`
        );
        
        console.log('✅ Webhook removed:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('❌ Error removing webhook:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to remove webhook',
            details: error.response?.data || error.message
        });
    }
});

module.exports = router;