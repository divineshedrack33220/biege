const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

class TelegramService {
    constructor() {
        this.bot = null;
        this.chatId = null;
        this.initialize();
    }

    initialize() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!token || !chatId) {
            console.warn('⚠️ Telegram credentials not configured - notifications disabled');
            return;
        }

        try {
            this.bot = new TelegramBot(token, { polling: false });
            this.chatId = chatId;
            console.log('✅ Telegram service initialized');
            
            // Test connection
            this.sendMessage(chatId, '🤖 <b>Beige Models Bot Online</b>\n\nTelegram notifications are active!', { parse_mode: 'HTML' })
                .catch(err => console.log('Test message failed:', err.message));
                
        } catch (error) {
            console.error('❌ Failed to initialize Telegram bot:', error.message);
        }
    }

    async sendBookingNotification(bookingData) {
        if (!this.bot || !this.chatId) {
            console.warn('⚠️ Telegram not configured - skipping notification');
            return false;
        }

        try {
            // If there's a model image, send it first
            if (bookingData.imageUrl) {
                await this.sendModelPhoto(bookingData);
            }

            const message = this.formatBookingMessage(bookingData);
            
            // Send main notification
            await this.bot.sendMessage(this.chatId, message, {
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });

            // Send action buttons
            await this.sendBookingActions(bookingData);

            // Try to send location preview (non-blocking)
            this.sendLocationPreview(bookingData).catch(err => {
                console.log('Could not get coordinates for location');
            });

            return true;
        } catch (error) {
            console.error('❌ Failed to send Telegram notification:', error.message);
            return false;
        }
    }

    async sendModelPhoto(bookingData) {
        try {
            const imageUrl = bookingData.imageUrl;
            const modelName = bookingData.modelName || 'Selected Model';
            
            // Send photo with caption
            await this.bot.sendPhoto(this.chatId, imageUrl, {
                caption: `📸 <b>${this.escapeHtml(modelName)}</b>`,
                parse_mode: 'HTML'
            });
            
            console.log('✅ Model photo sent for:', modelName);
        } catch (error) {
            console.error('❌ Failed to send model photo:', error.message);
            // Don't throw - continue with text notification even if image fails
        }
    }

    formatBookingMessage(booking) {
        const date = new Date(booking.bookingDateTime).toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'short'
        });

        const submittedDate = new Date(booking.createdAt || Date.now()).toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'short'
        });

        const location = `${booking.location.address}, ${booking.location.city}, ${booking.location.state}, ${booking.location.country}`;
        const shortId = booking._id.toString().slice(-6);

        let message = `
🔔 <b>✨ NEW BOOKING REQUEST ✨</b> 🔔
━━━━━━━━━━━━━━━━━━━━━

👤 <b>CLIENT:</b>
├─ Name: ${this.escapeHtml(booking.fullName)}
├─ Email: ${this.escapeHtml(booking.email)}
├─ Phone: ${this.escapeHtml(booking.phone)}
└─ Contact: ${this.escapeHtml(booking.contactMethod).toUpperCase()}

📸 <b>SHOOT:</b>
├─ Type: ${this.escapeHtml(booking.shootType)}
├─ Date: ${date}`;

        // Add model info if available
        if (booking.modelName) {
            message += `\n└─ Model: ${this.escapeHtml(booking.modelName)}`;
        }

        message += `\n📍 Location: ${this.escapeHtml(location)}`;

        if (booking.additionalNote) {
            message += `\n\n📝 <b>NOTE:</b>\n${this.escapeHtml(booking.additionalNote)}`;
        }

        message += `\n\n━━━━━━━━━━━━━━━━━━━━━
🆔 <b>ID:</b> <code>${booking._id}</code>
📊 <b>Ref:</b> #${shortId}
⏰ <b>Submitted:</b> ${submittedDate}

<i>Use buttons below to manage</i>`;

        return message;
    }

    async sendBookingActions(booking) {
        const bookingId = booking._id.toString();
        const shortId = bookingId.slice(-6);

        const inlineKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ CONFIRM', callback_data: `confirm_${bookingId}` },
                        { text: '👀 REVIEW', callback_data: `review_${bookingId}` },
                        { text: '❌ CANCEL', callback_data: `cancel_${bookingId}` }
                    ],
                    [
                        { text: '📋 DETAILS', callback_data: `details_${bookingId}` },
                        { text: '📧 CONTACT', callback_data: `contact_${bookingId}` }
                    ],
                    [
                        { text: '📅 CALENDAR', callback_data: `calendar_${bookingId}` },
                        { text: '💰 REVENUE', callback_data: `revenue_${bookingId}` }
                    ]
                ]
            }
        };

        // Add model photo button if model exists
        if (booking.modelName && booking.imageUrl) {
            inlineKeyboard.reply_markup.inline_keyboard.push([
                { text: '📸 VIEW MODEL', callback_data: `model_photo_${bookingId}` }
            ]);
        }

        try {
            await this.bot.sendMessage(
                this.chatId,
                `🔧 <b>Manage Booking #${shortId}</b>`,
                {
                    parse_mode: 'HTML',
                    ...inlineKeyboard
                }
            );
        } catch (error) {
            console.error('❌ Failed to send action buttons:', error.message);
        }
    }

    async sendModelPhotoById(bookingId, chatId) {
        try {
            const Booking = require('../models/Booking');
            const booking = await Booking.findById(bookingId);
            
            if (booking && booking.imageUrl) {
                await this.bot.sendPhoto(chatId, booking.imageUrl, {
                    caption: `📸 <b>${this.escapeHtml(booking.modelName || 'Model')}</b>`,
                    parse_mode: 'HTML'
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Failed to send model photo by ID:', error.message);
            return false;
        }
    }

    async sendLocationPreview(booking) {
        try {
            const address = encodeURIComponent(`${booking.location.address}, ${booking.location.city}, ${booking.location.state}, ${booking.location.country}`);
            const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${address}`, {
                timeout: 5000,
                headers: { 'User-Agent': 'BeigeModels/1.0' }
            });
            
            if (response.data && response.data[0]) {
                const { lat, lon } = response.data[0];
                await this.bot.sendLocation(this.chatId, parseFloat(lat), parseFloat(lon));
                
                const mapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
                await this.bot.sendMessage(this.chatId, `📍 <a href="${mapsLink}">Open in Google Maps</a>`, {
                    parse_mode: 'HTML',
                    disable_web_page_preview: false
                });
            }
        } catch (error) {
            // Silently fail - location preview is optional
            throw new Error('Location preview failed');
        }
    }

    async sendStatusUpdate(bookingId, status, updatedBy = 'Admin') {
        if (!this.bot || !this.chatId) return false;

        const statusEmoji = {
            'confirmed': '✅',
            'reviewed': '👀',
            'cancelled': '❌',
            'pending': '⏳'
        };

        const message = `
${statusEmoji[status] || '📝'} <b>BOOKING STATUS UPDATED</b>

━━━━━━━━━━━━━━━━━━━━━
📋 <b>Booking ID:</b> <code>${bookingId}</code>
📊 <b>New Status:</b> <b>${status.toUpperCase()}</b>
👤 <b>Updated by:</b> ${updatedBy}
⏰ <b>Time:</b> ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━
        `;

        try {
            await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
            return true;
        } catch (error) {
            console.error('❌ Failed to send status update:', error.message);
            return false;
        }
    }

    async sendDailySummary(bookings) {
        if (!this.bot || !this.chatId) return;

        const today = new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        const total = bookings.length;
        const pending = bookings.filter(b => b.status === 'pending').length;
        const reviewed = bookings.filter(b => b.status === 'reviewed').length;
        const confirmed = bookings.filter(b => b.status === 'confirmed').length;
        const cancelled = bookings.filter(b => b.status === 'cancelled').length;
        const revenue = bookings.reduce((sum, b) => sum + (b.revenue || 0), 0);

        const message = `
📊 <b>DAILY BOOKING SUMMARY</b>
━━━━━━━━━━━━━━━━━━━━━
📅 <b>Date:</b> ${today}

📈 <b>Statistics:</b>
├─ Total: ${total}
├─ Pending: ${pending}
├─ Reviewed: ${reviewed}
├─ Confirmed: ${confirmed}
├─ Cancelled: ${cancelled}
└─ Revenue: $${revenue}

━━━━━━━━━━━━━━━━━━━━━
<b>Recent:</b>
${bookings.slice(0, 3).map((b, i) => 
    `${i+1}. ${b.fullName} - ${b.shootType} (${b.status})${b.modelName ? ` [${b.modelName}]` : ''}`
).join('\n')}

━━━━━━━━━━━━━━━━━━━━━
<i>End of daily summary</i>
        `;

        try {
            await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('❌ Failed to send daily summary:', error.message);
        }
    }

    async sendMessage(chatId, message, options = {}) {
        if (!this.bot) return;
        try {
            await this.bot.sendMessage(chatId, message, options);
        } catch (error) {
            console.error('❌ Failed to send message:', error.message);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#96;');
    }
}

module.exports = new TelegramService();