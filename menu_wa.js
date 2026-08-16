// menu_wa.js - WHATSAPP MENU TANPA GAMBAR

// ==========================================
// 🔥 SHOW WHATSAPP MENU - TANPA GAMBAR
// ==========================================

const showWhatsAppMenu = async (chatId, sendNewMessage, bot = null, sendNewMessageWithCleanup = null) => {

    const content = `<b>WHATSAPP CONTROL</b>

📱 Status WA Bot
 └─ Cek status & koneksi bot
🔑 Pairing WhatsApp
 └─ Hubungkan nomor WhatsApp
🔄 Reset Session
 └─ Reset sesi WhatsApp
🔧 Repair WA
 └─ Perbaiki koneksi WhatsApp
♻️ Restart WA Bot
 └─ Restart layanan WhatsApp
📋 Logs WA Bot
 └─ Lihat log aktivitas bot
📢 Broadcast WA
 └─ Kirim pesan ke pengguna`;

    const replyButtons = {
        keyboard: [
            [
                { text: "📱 STATUS WA" },
                { text: "🔑 PAIRING" }
            ],
            [
                { text: "🔄 RESET SESSION" },
                { text: "🔧 REPAIR WA" }
            ],
            [
                { text: "♻️ RESTART WA" },
                { text: "📋 LOGS WA" }
            ],
            [
                { text: "📢 BROADCAST WA" }
            ],
            [
                { text: "🔙 MENU" }
            ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    };

    const sent = await bot.sendMessage(chatId, content, {
        parse_mode: "HTML",
        reply_markup: replyButtons
    });
    
    if (!global.menuMessageIds) global.menuMessageIds = {};
    global.menuMessageIds[chatId] = sent.message_id;
    console.log('✅ [WA Menu] Text terkirim!');
};

// ==========================================
// 🔥 SHOW PAIRING MENU
// ==========================================

const showPairingMenu = async (chatId, sendNewMessage, bot = null, sendNewMessageWithCleanup = null) => {

    const content = `🔑 <b>PAIRING WHATSAPP</b>

Kirim nomor WhatsApp dengan format:
/pair 628xxxxxxxxxx

Contoh: /pair 6285943111681

⚠️ Pastikan WA Bot berjalan di port 3005

📱 Setelah pairing, WA Bot akan otomatis terhubung.`;

    const replyButtons = {
        keyboard: [
            [
                { text: "📱 STATUS WA" }
            ],
            [
                { text: "🔙 WHATSAPP" },
                { text: "🔙 MENU" }
            ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    };

    const sent = await bot.sendMessage(chatId, content, {
        parse_mode: "HTML",
        reply_markup: replyButtons
    });
    if (!global.menuMessageIds) global.menuMessageIds = {};
    global.menuMessageIds[chatId] = sent.message_id;
};

// ==========================================
// 🔥 SHOW BROADCAST MENU
// ==========================================

const showBroadcastWAMenu = async (chatId, sendNewMessage, bot = null, sendNewMessageWithCleanup = null) => {

    const content = `📢 <b>BROADCAST WHATSAPP</b>

Kirim pesan broadcast ke semua kontak WhatsApp:

/broadcastwa <pesan>

Contoh: /broadcastwa Promo spesial hari ini!

⚠️ Pastikan WA Bot terhubung`;

    const replyButtons = {
        keyboard: [
            [
                { text: "📱 STATUS WA" }
            ],
            [
                { text: "🔙 WHATSAPP" },
                { text: "🔙 MENU" }
            ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    };

    const sent = await bot.sendMessage(chatId, content, {
        parse_mode: "HTML",
        reply_markup: replyButtons
    });
    if (!global.menuMessageIds) global.menuMessageIds = {};
    global.menuMessageIds[chatId] = sent.message_id;
};

// ==========================================
// 🔥 EXPORT
// ==========================================

module.exports = {
    showWhatsAppMenu,
    showPairingMenu,
    showBroadcastWAMenu
};