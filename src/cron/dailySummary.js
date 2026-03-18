const cron = require('node-cron');
const Booking = require('../models/Booking');
const telegramService = require('../services/telegramService');

// Check if cron should be enabled
const enableCron = process.env.ENABLE_CRON !== 'false';

if (enableCron) {
    console.log('⏰ Initializing cron jobs...');

    // Run every day at 9 PM
    cron.schedule('0 21 * * *', async () => {
        console.log('📊 Sending daily booking summary...');
        
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        try {
            const bookings = await Booking.find({
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            }).sort({ createdAt: -1 });

            if (bookings.length > 0) {
                await telegramService.sendDailySummary(bookings);
                console.log('✅ Daily summary sent');
            } else {
                console.log('📊 No bookings today - skipping summary');
            }
        } catch (error) {
            console.error('❌ Error sending daily summary:', error.message);
        }
    });

    // Also run at 12 PM for midday report
    cron.schedule('0 12 * * *', async () => {
        console.log('📊 Sending midday booking update...');
        
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const now = new Date();

        try {
            const bookings = await Booking.find({
                createdAt: { $gte: startOfDay, $lte: now }
            }).sort({ createdAt: -1 });

            if (bookings.length > 0) {
                const total = bookings.length;
                const pending = bookings.filter(b => b.status === 'pending').length;
                
                await telegramService.sendMessage(
                    process.env.TELEGRAM_CHAT_ID,
                    `📊 <b>Midday Update</b>\n\n` +
                    `Bookings so far today: ${total}\n` +
                    `Pending: ${pending}\n` +
                    `Last booking: ${bookings[0]?.fullName || 'N/A'}`,
                    { parse_mode: 'HTML' }
                );
                console.log('✅ Midday update sent');
            }
        } catch (error) {
            console.error('❌ Error sending midday update:', error.message);
        }
    });

    console.log('✅ Cron jobs initialized');
} else {
    console.log('⏰ Cron jobs disabled');
}