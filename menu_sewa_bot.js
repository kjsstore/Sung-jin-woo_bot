// ==========================================
// 🔥 MENU SEWA BOT (AUTOGOPAY + DETEKSI OTOMATIS + QRIS LOGO)
// ==========================================

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const payment = require('./payment');
const menuModule = require('./menu');
const { deleteAllMessages, hasSeenWelcome, showWelcomeScreen } = menuModule;

// ==========================================
// 🔥 KONFIGURASI LOGO QRIS (STABIL)
// ==========================================

const QRIS_CONFIG = {
    autogopay: {
        logoUrl: 'https://files.catbox.moe/cnveuv.png',
        logoSize: 0.25,
        useCircle: true,
    },
    default: {
        logoUrl: 'https://files.catbox.moe/cnveuv.png',
        logoSize: 0.25,
        useCircle: true,
    }
};

// ==========================================
// 🔥 FUNGSI TAMBAH LOGO KE QRIS (STABIL)
// ==========================================

const { createCanvas, loadImage } = require('canvas');
const logoCache = {};
const downloadingLogos = {};

async function getLogoForMethod(method = 'autogopay') {
    const config = QRIS_CONFIG[method.toLowerCase()] || QRIS_CONFIG.default;
    const logoUrl = config.logoUrl;
    
    if (logoCache[logoUrl]) {
        return logoCache[logoUrl];
    }
    
    if (downloadingLogos[logoUrl]) {
        return downloadingLogos[logoUrl];
    }
    
    downloadingLogos[logoUrl] = (async () => {
        try {
            console.log(`📥 [QRIS] Downloading logo...`);
            const response = await axios.get(logoUrl, {
                responseType: 'arraybuffer',
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                }
            });
            
            const logoBuffer = Buffer.from(response.data, 'binary');
            const logoImg = await loadImage(logoBuffer);
            logoCache[logoUrl] = logoImg;
            console.log(`✅ [QRIS] Logo downloaded: ${logoImg.width}x${logoImg.height}`);
            return logoImg;
        } catch (err) {
            console.log(`⚠️ [QRIS] Logo download failed:`, err.message);
            return null;
        } finally {
            delete downloadingLogos[logoUrl];
        }
    })();
    
    return downloadingLogos[logoUrl];
}

async function addLogoToQRIS(qrImageBuffer, method = 'autogopay') {
    try {
        const config = QRIS_CONFIG[method.toLowerCase()] || QRIS_CONFIG.default;
        const logoImg = await getLogoForMethod(method);
        
        if (!logoImg) {
            console.log(`⚠️ [QRIS] No logo, using original`);
            return qrImageBuffer;
        }
        
        const qrImage = await loadImage(qrImageBuffer);
        const scale = 1.3;
        const canvasWidth = Math.round(qrImage.width * scale);
        const canvasHeight = Math.round(qrImage.height * scale);
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(qrImage, 0, 0, canvasWidth, canvasHeight);
        
        const logoSize = Math.min(canvasWidth, canvasHeight) * config.logoSize;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        ctx.save();
        if (config.useCircle) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, logoSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
        }
        ctx.drawImage(logoImg, centerX - logoSize / 2, centerY - logoSize / 2, logoSize, logoSize);
        ctx.restore();
        
        const buffer = canvas.toBuffer('image/png', { compressionLevel: 6 });
        console.log(`✅ [QRIS] Logo added! Size: ${buffer.length} bytes`);
        return buffer;
        
    } catch (error) {
        console.error(`❌ [QRIS] Error:`, error.message);
        return qrImageBuffer;
    }
}

// ==========================================
// 🔥 AMBIL CONFIG
// ==========================================

const TOPUP_CONFIG = config.TOPUP || { CHECK_INTERVAL: 10000, MAX_CHECKS: 60, EXPIRY_MINUTES: 10 };
const NOTIF_CONFIG = config.NOTIFICATION || {};

// ==========================================
// 🔥 KONFIGURASI BRIDGE & WA-BOT
// ==========================================

const BRIDGE_CONFIG = {
    URL: process.env.BRIDGE_URL || 'http://127.0.0.1:3004',
    ENABLED: true
};

const WA_BOT_CONFIG = {
    PATH: process.env.WA_BOT_PATH || path.join(__dirname, '../wabot'),
    DATA_FOLDER: 'data',
    SEWA_FILE: 'sewa_aktif.json',
    DAERAH_FILE: 'daerah_user.json'
};

// ==========================================
// 🔥 FUNGSI FORMAT RUPIAH
// ==========================================

const formatRupiah = (angka) => {
    if (!angka && angka !== 0) return '0';
    return new Intl.NumberFormat('id-ID').format(angka);
};

// ==========================================
// 🔥 FUNGSI SYNC KE BRIDGE
// ==========================================

async function syncToBridge(endpoint, data) {
    try {
        if (!BRIDGE_CONFIG.ENABLED) {
            console.log('⚠️ [SYNC] Bridge disabled');
            return { success: false, error: 'Bridge disabled' };
        }

        const response = await axios.post(`${BRIDGE_CONFIG.URL}${endpoint}`, data, {
            timeout: 5000
        });
        
        console.log(`✅ [SYNC] ${endpoint} berhasil`);
        return response.data;
    } catch (error) {
        console.log(`⚠️ [SYNC] ${endpoint} gagal:`, error.message);
        return { success: false, error: error.message };
    }
}

// ==========================================
// 🔥 FUNGSI SYNC SEWA KE WA-BOT
// ==========================================

async function syncSewaToWABot(chatId, sewaData) {
    try {
        const result = await syncToBridge('/add-sewa', {
            chatId: chatId.toString(),
            duration: sewaData.duration,
            expired: sewaData.expired,
            startDate: sewaData.start_date,
            expiredDate: sewaData.expired_date,
            username: sewaData.username || chatId.toString()
        });

        const waFolder = path.join(WA_BOT_CONFIG.PATH, WA_BOT_CONFIG.DATA_FOLDER);
        if (!fs.existsSync(waFolder)) {
            fs.mkdirSync(waFolder, { recursive: true });
        }

        const waSewaFile = path.join(waFolder, WA_BOT_CONFIG.SEWA_FILE);
        let waData = {};
        if (fs.existsSync(waSewaFile)) {
            try { waData = JSON.parse(fs.readFileSync(waSewaFile, 'utf8')); } catch (e) {}
        }

        waData[chatId] = {
            active: sewaData.active,
            expired: sewaData.expired,
            daerah: sewaData.daerah || [],
            duration: sewaData.duration,
            start_date: sewaData.start_date,
            expired_date: sewaData.expired_date,
            username: sewaData.username || chatId.toString()
        };

        fs.writeFileSync(waSewaFile, JSON.stringify(waData, null, 2));
        console.log(`✅ [SYNC] File WA-Bot updated: ${waSewaFile}`);

        return { success: true, result };
    } catch (error) {
        console.error('❌ [SYNC] Error:', error.message);
        return { success: false, error: error.message };
    }
}

// ==========================================
// 🔥 FUNGSI SYNC DAERAH KE WA-BOT
// ==========================================

async function syncDaerahToWABot(chatId, daerah) {
    try {
        const parsed = parseDaerahString(daerah);
        const result = await syncToBridge('/add-daerah', {
            chatId: chatId.toString(),
            kabupaten: parsed.kabupaten,
            kecamatan: parsed.kecamatan,
            kelurahan: parsed.kelurahan
        });

        const waFolder = path.join(WA_BOT_CONFIG.PATH, WA_BOT_CONFIG.DATA_FOLDER);
        if (!fs.existsSync(waFolder)) {
            fs.mkdirSync(waFolder, { recursive: true });
        }

        const waSewaFile = path.join(waFolder, WA_BOT_CONFIG.SEWA_FILE);
        let waData = {};
        if (fs.existsSync(waSewaFile)) {
            try { waData = JSON.parse(fs.readFileSync(waSewaFile, 'utf8')); } catch (e) {}
        }

        if (!waData[chatId]) {
            waData[chatId] = {
                active: true,
                expired: 'Forever',
                daerah: [],
                duration: 'Unknown',
                start_date: new Date().toISOString().split('T')[0],
                expired_date: 'Forever',
                username: chatId.toString()
            };
        }

        if (!waData[chatId].daerah) {
            waData[chatId].daerah = [];
        }

        if (!waData[chatId].daerah.includes(daerah)) {
            waData[chatId].daerah.push(daerah);
        }

        fs.writeFileSync(waSewaFile, JSON.stringify(waData, null, 2));
        console.log(`✅ [SYNC] Daerah ditambahkan ke WA-Bot: ${daerah}`);

        return { success: true, result };
    } catch (error) {
        console.error('❌ [SYNC] Error:', error.message);
        return { success: false, error: error.message };
    }
}

// ==========================================
// 🔥 FUNGSI PARSE DAERAH
// ==========================================

function parseDaerahString(daerahString) {
    const parts = daerahString.split(' > ');
    if (parts.length === 3) {
        return {
            kabupaten: parts[0],
            kecamatan: parts[1],
            kelurahan: parts[2]
        };
    }
    return null;
}

// ==========================================
// 🔥 HARGA SEWA
// ==========================================

const HARGA_SEWA = {
    '1minggu': { price: 1, days: 7, label: '1 Minggu' },
    '1bulan': { price: 100000, days: 30, label: '1 Bulan' },
    '1tahun': { price: 500000, days: 365, label: '1 Tahun' }
};

// ==========================================
// 🔥 GLOBAL UNTUK SIMPAN MESSAGE ID QRIS
// ==========================================

global.lastQRMessage = global.lastQRMessage || {};
const autoCheckIntervals = {};

// ==========================================
// 🔥 GLOBAL FLAG UNTUK CEGAH DOUBLE PROCESS
// ==========================================

const processingFlags = {};

// ==========================================
// 🔥 FUNGSI HAPUS QRIS
// ==========================================

const deleteQRMessage = async (bot, chatId) => {
    try {
        const lastMsg = global.lastQRMessage?.[chatId];
        if (lastMsg) {
            await bot.deleteMessage(chatId, lastMsg);
            console.log(`🗑️ QRIS deleted for ${chatId}`);
            delete global.lastQRMessage[chatId];
        }
    } catch (error) {
        console.log(`❌ Gagal hapus QRIS: ${error.message}`);
    }
};

// ==========================================
// 🔥 FUNGSI HAPUS REPLY KEYBOARD
// ==========================================

const removeReplyKeyboard = async (bot, chatId) => {
    try {
        const sent = await bot.sendMessage(chatId, '\u200B', {
            reply_markup: {
                remove_keyboard: true
            },
            disable_notification: true,
            disable_web_page_preview: true
        });
        console.log(`✅ [KEYBOARD] Removed for ${chatId}`);
        
        setTimeout(async () => {
            try {
                await bot.deleteMessage(chatId, sent.message_id);
                console.log(`🗑️ [KEYBOARD] Pesan hapus keyboard dihapus untuk ${chatId}`);
            } catch (e) {}
        }, 500);
        
        return true;
    } catch (error) {
        console.log(`❌ [KEYBOARD] Failed to remove: ${error.message}`);
        return false;
    }
};

// ==========================================
// 🔥 FUNGSI STOP AUTO CHECK
// ==========================================

function stopAutoCheck(chatId) {
    if (autoCheckIntervals[chatId]) {
        clearInterval(autoCheckIntervals[chatId]);
        delete autoCheckIntervals[chatId];
        console.log(`🛑 [AUTOCHECK] Stopped for ${chatId}`);
        return true;
    }
    return false;
}

// ==========================================
// 🔥 FUNGSI NOTIFIKASI KE CHANNEL
// ==========================================

const sendNotifToChannel = async (bot, message) => {
    try {
        if (!NOTIF_CONFIG.ENABLED) {
            console.log('⚠️ [NOTIF] Channel notification disabled');
            return;
        }
        
        const channelId = NOTIF_CONFIG.CHAT_ID;
        if (!channelId) {
            console.log('⚠️ [NOTIF] No CHAT_ID configured');
            return;
        }
        
        await bot.sendMessage(channelId, message, { 
            parse_mode: 'Markdown',
            disable_notification: false
        });
        
        console.log('📢 [NOTIF] Channel notification sent!');
    } catch (error) {
        console.log('❌ [NOTIF] Gagal kirim notifikasi channel:', error.message);
    }
};

// ==========================================
// 🔥 QRIS GENERATOR (AUTOGOPAY)
// ==========================================

async function generateQRIS(amount) {
    try {
        console.log(`💰 [AUTOGOPAY] Generating QRIS for Rp${amount}...`);
        
        const cleanAmount = parseInt(amount) || 0;
        if (cleanAmount <= 0) {
            throw new Error(`Invalid amount: ${amount}`);
        }
        
        const result = await payment.generateQRIS(cleanAmount, 'Sewa Bot KJS');
        
        if (result.success) {
            console.log(`✅ [AUTOGOPAY] QRIS Generated: ID=${result.transaction_id}, Amount=${result.amount}`);
            return result;
        }
        
        throw new Error(result.error || 'AutoGoPay gagal generate QRIS');
        
    } catch (error) {
        console.error('❌ [AUTOGOPAY] Error:', error.message);
        return { success: false, error: error.message };
    }
}

// ==========================================
// 🔥 STORE PENDING SEWA
// ==========================================

const pendingSewa = {};

// ==========================================
// 🔥 FUNGSI SEWA (SEMUA KE WA-BOT)
// ==========================================

const getSewa = (chatId) => {
    const sewaFile = '/root/wabot/data/sewa_aktif.json';
    let sewa = {};
    let result = null;
    
    if (fs.existsSync(sewaFile)) {
        try { 
            sewa = JSON.parse(fs.readFileSync(sewaFile, 'utf8'));
            result = sewa[chatId] || null;
            console.log(`[GETSEWA] ✅ Dari WA-BOT: ${chatId} -> ${result ? 'ADA' : 'TIDAK'}`);
        } catch (e) {
            console.log(`[GETSEWA] ❌ Error:`, e.message);
        }
    }
    
    if (!result || !result.active) {
        const localFile = path.join(__dirname, 'sewa_aktif.json');
        if (fs.existsSync(localFile)) {
            try {
                const localData = JSON.parse(fs.readFileSync(localFile, 'utf8'));
                if (localData[chatId] && localData[chatId].active) {
                    result = localData[chatId];
                    console.log(`[GETSEWA] ✅ Dari LOKAL: ${chatId}`);
                    
                    sewa[chatId] = result;
                    fs.writeFileSync(sewaFile, JSON.stringify(sewa, null, 2));
                    console.log(`[GETSEWA] ✅ Sync ke WA-BOT: ${chatId}`);
                }
            } catch (e) {
                console.log(`[GETSEWA] ❌ Error lokal:`, e.message);
            }
        }
    }
    
    return result || null;
};

const aktifkanSewa = async (chatId, duration, days, username = null) => {
    const sewaFile = '/root/wabot/data/sewa_aktif.json';
    let sewa = {};
    if (fs.existsSync(sewaFile)) {
        try { sewa = JSON.parse(fs.readFileSync(sewaFile)); } catch (e) {}
    }
    
    const now = Date.now();
    const expired = days === 'Forever' ? 'Forever' : now + (days * 24 * 60 * 60 * 1000);
    
    const daerahLama = sewa[chatId]?.daerah || [];
    const usernameLama = sewa[chatId]?.username || chatId.toString();
    
    const sewaData = {
        duration: duration,
        start: now,
        expired: expired,
        active: true,
        start_date: new Date(now).toISOString().split('T')[0],
        expired_date: days === 'Forever' ? 'Forever' : new Date(expired).toISOString().split('T')[0],
        daerah: daerahLama,
        username: username || usernameLama,
        last_active: new Date().toISOString()
    };
    
    sewa[chatId] = sewaData;
    fs.writeFileSync(sewaFile, JSON.stringify(sewa, null, 2));
    console.log(`✅ [SEWA] Aktif untuk ${chatId}, daerah tetap: ${daerahLama.length} daerah`);
    
    await syncSewaToWABot(chatId, sewaData);
    
    return sewa[chatId];
};

const notifyOwner = async (bot, message) => {
    try {
        const ownerId = config.BOT.OWNER_ID;
        if (ownerId) {
            await bot.sendMessage(ownerId, 
                `🔔 *NOTIFIKASI SEWA*\n\n${message}`,
                { parse_mode: 'Markdown' }
            );
        }
    } catch (error) {
        console.error('Notify owner error:', error);
    }
};

// ==========================================
// 🔥 START AUTO CHECK
// ==========================================

const startAutoCheck = async (chatId, bot, sendMessage, trx) => {
    stopAutoCheck(chatId);
    
    console.log(`🚀 [AUTOCHECK] Starting for ${chatId}, ID: ${trx.transaction_id}`);
    
    const CHECK_INTERVAL = TOPUP_CONFIG.CHECK_INTERVAL || 10000;
    const MAX_CHECKS = TOPUP_CONFIG.MAX_CHECKS || 40;
    let checkCount = 0;
    let isCompleted = false;
    
    const intervalId = setInterval(async () => {
        if (isCompleted) {
            stopAutoCheck(chatId);
            return;
        }
        
        checkCount++;
        
        if (!pendingSewa[chatId]) {
            console.log(`⚠️ [AUTOCHECK] No pending for ${chatId}, stopping...`);
            stopAutoCheck(chatId);
            return;
        }
        
        const currentTrx = pendingSewa[chatId];
        if (currentTrx.transaction_id !== trx.transaction_id) {
            console.log(`⚠️ [AUTOCHECK] Transaction changed for ${chatId}, stopping...`);
            stopAutoCheck(chatId);
            return;
        }
        
        if (Date.now() > trx.expiry) {
            console.log(`⏰ [AUTOCHECK] Expired for ${chatId}`);
            isCompleted = true;
            stopAutoCheck(chatId);
            await deleteQRMessage(bot, chatId);
            delete pendingSewa[chatId];
            sendMessage(chatId, '⏰ QRIS Expired! Silahkan sewa ulang.');
            return;
        }
        
        if (checkCount >= MAX_CHECKS) {
            console.log(`⚠️ [AUTOCHECK] Max checks reached for ${chatId}`);
            stopAutoCheck(chatId);
            sendMessage(chatId, '⏰ Waktu cek habis. Cek manual dengan /ceksewa');
            return;
        }
        
        try {
            console.log(`🔄 [AUTOCHECK] #${checkCount} - Checking payment for ${chatId}...`);
            
            const result = await payment.cekStatusDual(
                trx.transaction_id,
                trx.originalAmount,
                trx.method || 'AUTOGOPAY',
                trx.created_at
            );
            
            console.log(`📊 [AUTOCHECK] Status: ${result.status}, matched: ${result.matched}`);
            
            if (result.matched || result.status === 'settlement' || result.status === 'success' || result.status === 'paid') {
                console.log(`✅ [AUTOCHECK] PAYMENT FOUND for ${chatId}!`);
                isCompleted = true;
                stopAutoCheck(chatId);
                
                await deleteQRMessage(bot, chatId);
                
                const username = trx.username || chatId.toString();
                const sewa = await aktifkanSewa(chatId, trx.duration, trx.days, username);
                delete pendingSewa[chatId];

                let usernameTele = username || chatId.toString();
                try {
                    const userInfo = await bot.getChat(chatId);
                    if (userInfo && userInfo.username) {
                        usernameTele = `@${userInfo.username}`;
                    } else if (userInfo && userInfo.first_name) {
                        usernameTele = userInfo.first_name;
                    }
                } catch (e) {}

                await sendNotifToChannel(bot,
                    `🎉 *SEWA BERHASIL!*\n\n` +
                    `👤 User: ${usernameTele}\n` +
                    `🆔 ID: ${chatId}\n` +
                    `📦 Paket: ${trx.duration}\n` +
                    `💰 Harga: Rp${formatRupiah(trx.price)}\n` +
                    `📅 Aktif sampai: ${sewa.expired_date}\n\n` +
                    `✅ Status: AKTIF`
                );

                const now = Date.now();
                const expired = sewa.expired === 'Forever' ? Infinity : sewa.expired;
                let sisaHari = 0;
                let sisaJam = 0;
                if (expired === Infinity) {
                    sisaHari = '∞';
                    sisaJam = '';
                } else {
                    const sisaMs = expired - now;
                    sisaHari = Math.ceil(sisaMs / (1000 * 60 * 60 * 24));
                    sisaJam = Math.floor((sisaMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                }

                const msg = `<blockquote>✅ SEWA BERHASIL DIAKTIFKAN!...

📦 Paket: ${trx.duration}
💰 Harga: Rp${formatRupiah(trx.price)}
📅 Mulai: ${sewa.start_date}
📅 Berakhir: ${sewa.expired_date}
⏳ Sisa: ${sisaHari} hari ${sisaJam} jam
👤 User: ${username}

📌 Data sudah sync ke WA-Bot!
Bot akan mendeteksi data dari grup sesuai daerah Anda.</blockquote>`;

                const options = {
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "📍 TAMBAH DAERAH", callback_data: "tambah_daerah" }],
                            [{ text: "📊 CEK SEWA", callback_data: "cek_sewa" }],
                            [{ text: "🔙 KEMBALI KE MENU", callback_data: "back_to_menu" }]
                        ]
                    }
                };

                await sendMessage(chatId, msg, options);
                
                const ownerId = config.BOT.OWNER_ID;
                if (ownerId) {
                    try {
                        await bot.sendMessage(ownerId,
                            `✅ User ${chatId} sewa berhasil!\n📦 ${trx.duration}\n💰 Rp${formatRupiah(trx.price)}`,
                            { parse_mode: 'Markdown' }
                        );
                    } catch (e) {}
                }
                
                return;
            }
            
        } catch (error) {
            console.error('❌ [AUTOCHECK] Error:', error.message);
        }
        
    }, CHECK_INTERVAL);
    
    autoCheckIntervals[chatId] = intervalId;
};

// ==========================================
// 🔥 SHOW SEWA BOT MENU
// ==========================================

const showSewaBotMenu = async (chatId, sendNewMessage, bot = null) => {
    const currentSewa = getSewa(chatId);
    let statusText = '';
    
    if (currentSewa && currentSewa.active) {
        const now = Date.now();
        const expired = currentSewa.expired === 'Forever' ? Infinity : currentSewa.expired;
        if (expired === Infinity || expired > now) {
            const sisaHari = expired === Infinity ? '∞' : Math.ceil((expired - now) / (1000 * 60 * 60 * 24));
            statusText = `
📊 *Status Sewa:* ✅ ACTIVE
📦 Paket: ${currentSewa.duration}
📅 Mulai: ${currentSewa.start_date}
📅 Berakhir: ${currentSewa.expired_date}
⏳ Sisa: ${sisaHari} ${sisaHari === '∞' ? '' : 'hari lagi'}
📍 Daerah: ${currentSewa.daerah?.length || 0} terdaftar
`;
        } else {
            statusText = `
📊 *Status Sewa:* ⏰ EXPIRED
📦 Paket: ${currentSewa.duration}
📅 Berakhir: ${currentSewa.expired_date}
`;
        }
    } else {
        statusText = `
📊 *Status Sewa:* ❌ BELUM SEWA
`;
    }

    const replyButtons = {
        keyboard: [
            [{ text: "1 Minggu - Rp1" }, { text: "1 Bulan - Rp100.000" }],
            [{ text: "1 Tahun - Rp500.000" }],
            [{ text: "📊 CEK SEWA" }, { text: "📍 DAERAH SAYA" }],
            [{ text: "🔙 BACK MENU" }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: true
    };

    const content = `
💵 *Paket Sewa:*

 🏷️ 1 Minggu : Rp 1 (TEST)
 🏷️ 1 Bulan  : Rp 100.000
 🏷️ 1 Tahun  : Rp 500.000

${statusText}
📌 Tekan tombol paket di bawah
💳 Pembayaran via Qris 
✅ Aktifasi otomatis setelah bayar
`;

    if (bot) {
        try {
            if (global.lastQRMessage && global.lastQRMessage[chatId]) {
                await bot.deleteMessage(chatId, global.lastQRMessage[chatId]);
                console.log(`🗑️ [SEWA] Hapus pesan lama: ${global.lastQRMessage[chatId]}`);
                delete global.lastQRMessage[chatId];
            }
        } catch (e) {
            console.log(`⚠️ [SEWA] Gagal hapus pesan lama: ${e.message}`);
        }
        
        const sent = await bot.sendMessage(chatId, content, {
            parse_mode: "Markdown",
            reply_markup: replyButtons
        });
        
        if (sent && sent.message_id) {
            if (!global.lastQRMessage) global.lastQRMessage = {};
            global.lastQRMessage[chatId] = sent.message_id;
            console.log(`✅ [SEWA] Simpan pesan baru: ${sent.message_id} untuk ${chatId}`);
        }
    } else {
        await sendNewMessage(chatId, content, {
            parse_mode: "Markdown",
            reply_markup: replyButtons
        });
    }
};

// ==========================================
// 🔥 PROSES SEWA (DENGAN LOGO QRIS) - FIX DOUBLE PROCESS
// ==========================================

const processSewa = async (chatId, duration, price, days, bot, sendMessage, sendNewMessage) => {
    // 🔥 CEGAH DOUBLE PROCESS
    if (processingFlags[chatId]) {
        console.log(`⚠️ [SEWA] Already processing for ${chatId}, skipping duplicate...`);
        await sendMessage(chatId, 
            `⏳ *Proses sedang berjalan...*\n\n` +
            `Mohon tunggu sebentar, jangan klik tombol berulang kali.`,
            { parse_mode: 'Markdown' }
        );
        return;
    }
    
    // 🔥 SET FLAG
    processingFlags[chatId] = true;
    console.log(`🔒 [SEWA] Processing lock acquired for ${chatId}`);
    
    try {
        const cleanPrice = parseInt(price) || 0;
        if (cleanPrice <= 0) {
            console.error(`❌ [SEWA] Invalid price: ${price}`);
            await sendMessage(chatId, 
                `❌ *Harga tidak valid!*\n\n` +
                `📦 Paket: ${duration}\n` +
                `💰 Harga: ${price}\n\n` +
                `Silahkan coba lagi.`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
        console.log(`💰 [SEWA] Processing: ${duration}, Price: ${cleanPrice}, Days: ${days}`);
        
        const currentSewa = getSewa(chatId);
        if (currentSewa && currentSewa.active) {
            const now = Date.now();
            const expired = currentSewa.expired === 'Forever' ? Infinity : currentSewa.expired;
            if (expired === Infinity || expired > now) {
                const sisaHari = expired === Infinity ? '∞' : Math.ceil((expired - now) / (1000 * 60 * 60 * 24));
                await sendMessage(chatId, 
                    `⚠️ *Kamu masih punya sewa aktif!*\n\n` +
                    `📦 ${currentSewa.duration}\n` +
                    `⏳ Sisa ${sisaHari} ${sisaHari === '∞' ? '' : 'hari'}\n\n` +
                    `Tunggu sampai habis atau /batalkan.`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }
        }

        if (pendingSewa[chatId]) {
            const trx = pendingSewa[chatId];
            if (Date.now() < trx.expiry) {
                const sisa = Math.ceil((trx.expiry - Date.now()) / 1000 / 60);
                await sendMessage(chatId, 
                    `⚠️ *Ada transaksi pending!*\n` +
                    `📦 ${trx.duration}\n` +
                    `💰 Rp${formatRupiah(trx.amount)}\n` +
                    `⏳ Sisa ${sisa} menit\n\n` +
                    `Tunggu selesai atau /batalkan`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }
            delete pendingSewa[chatId];
        }

        const prosesMsg = await sendMessage(chatId, 
            `⏳ *Memproses pembayaran...*\n\n` +
            `📦 Paket: ${duration}\n` +
            `💰 Harga: Rp${formatRupiah(cleanPrice)}\n\n` +
            `⏱️ Mohon tunggu sebentar...`,
            { parse_mode: 'Markdown' }
        );

        const qris = await generateQRIS(cleanPrice);
        
        try {
            if (prosesMsg && prosesMsg.message_id) {
                await bot.deleteMessage(chatId, prosesMsg.message_id);
            }
        } catch (e) {}

        if (!qris.success) {
            await sendMessage(chatId, 
                `❌ Gagal generate QRIS: ${qris.error || 'Coba lagi'}`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        const expiryTime = qris.expiry_time || Date.now() + (TOPUP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

        pendingSewa[chatId] = {
            duration: duration,
            days: days,
            price: cleanPrice,
            amount: qris.amount,
            originalAmount: qris.amount_original || cleanPrice,
            transaction_id: qris.transaction_id,
            expiry: expiryTime,
            created_at: qris.created_at || Date.now(),
            username: chatId.toString(),
            method: qris.method || 'AUTOGOPAY'
        };

        const caption = `
⟣⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋𝐒𝐄𝐖𝐀 𝐁𝐎𝐓⚋⚋⚋⚋⚋⚋⚋⚋⚋⚋⟢

📦 𝙋𝙖𝙠𝙚𝙩: ${duration}
💰 𝘿𝙚𝙩𝙖𝙞𝙡:
├ 𝙏𝙤𝙩𝙖𝙡: 𝙍𝙥${formatRupiah(qris.amount)}
└ 𝙄𝘿: ${qris.transaction_id}

⏳ 𝙀𝙭𝙥𝙞𝙧𝙚𝙙: ${Math.ceil((expiryTime - Date.now()) / 60000)} 𝙢𝙚𝙣𝙞𝙩
`;

        try {
            const paymentButtons = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "🔄 𝗖𝗵𝗲𝗰𝗸",
                                callback_data: "ceksewa"
                            },
                            {
                                text: "❌ 𝗕𝗮𝘁𝗮𝗹",
                                callback_data: "batalkan_sewa"
                            }
                        ]
                    ]
                }
            };

            let sentMsg;

            if (qris.image_data) {
                const base64Data = qris.image_data.replace(
                    /^data:image\/\w+;base64,/,
                    ''
                );

                let photoBuffer = Buffer.from(base64Data, 'base64');
                
                try {
                    photoBuffer = await addLogoToQRIS(photoBuffer, 'autogopay');
                    console.log('✅ [LOGO] Logo berhasil ditambahkan ke QRIS!');
                } catch (logoError) {
                    console.log('⚠️ [LOGO] Gagal tambah logo, pakai QRIS asli:', logoError.message);
                }

                sentMsg = await bot.sendPhoto(
                    chatId,
                    photoBuffer,
                    {
                        caption: caption,
                        parse_mode: "HTML",
                        ...paymentButtons
                    }
                );

                console.log('✅ [processSewa] QRIS PHOTO TERKIRIM!');

            } else {
                sentMsg = await sendNewMessage(
                    chatId,
                    caption,
                    {
                        parse_mode: "HTML",
                        ...paymentButtons
                    }
                );
            }

            if (sentMsg && sentMsg.message_id) {
                global.lastQRMessage[chatId] = sentMsg.message_id;
            }

        } catch (error) {
            console.log(
                '❌ [processSewa] Gagal kirim QRIS:',
                error.message
            );

            await sendNewMessage(
                chatId,
                caption,
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "🔄 𝗖𝗵𝗲𝗰𝗸",
                                    callback_data: "ceksewa"
                                },
                                {
                                    text: "❌ 𝗕𝗮𝘁𝗮𝗹",
                                    callback_data: "batalkan_sewa"
                                }
                            ]
                        ]
                    }
                }
            );
        }

        await startAutoCheck(
            chatId,
            bot,
            sendMessage,
            pendingSewa[chatId]
        );

    } catch (error) {
        console.error('❌ Sewa error:', error);
        await sendMessage(
            chatId,
            '❌ Gagal memproses sewa.'
        );
    } finally {
        // 🔥 RELEASE FLAG
        delete processingFlags[chatId];
        console.log(`🔓 [SEWA] Processing lock released for ${chatId}`);
    }
};

// ==========================================
// 🔥 CEK SEWA
// ==========================================

const cekSewa = async (chatId, sendMessage) => {
    const sewa = getSewa(chatId);
    
    if (!sewa || !sewa.active) {
        return sendMessage(chatId, 
            `❌ *Belum ada sewa aktif*\n\nGunakan /sewa untuk mulai.`,
            { parse_mode: 'Markdown' }
        );
    }
    
    const now = Date.now();
    const expired = sewa.expired === 'Forever' ? Infinity : sewa.expired;
    
    if (expired !== Infinity && now >= expired) {
        return sendMessage(chatId, 
            `⏰ *Sewa sudah EXPIRED*\n\n` +
            `📦 ${sewa.duration}\n` +
            `📅 Berakhir: ${sewa.expired_date}\n\n` +
            `Gunakan /sewa untuk perpanjang.`,
            { parse_mode: 'Markdown' }
        );
    }
    
    const sisaMs = expired === Infinity ? Infinity : expired - now;
    const sisaHari = sisaMs === Infinity ? '∞' : Math.ceil(sisaMs / (1000 * 60 * 60 * 24));
    const sisaJam = sisaMs === Infinity ? '-' : Math.floor((sisaMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    let daerahList = '';
    if (sewa.daerah && sewa.daerah.length > 0) {
        sewa.daerah.forEach((d, i) => {
            daerahList += `${i+1}. ${d}\n`;
        });
    } else {
        daerahList = 'Belum ada daerah terdaftar';
    }
    
    const username = sewa.username || chatId;
    
    return sendMessage(chatId, 
        `✅ *Status Sewa Aktif*\n\n` +
        `👤 *User:* ${username}\n` +
        `📦 *Paket:* ${sewa.duration}\n` +
        `📅 *Mulai:* ${sewa.start_date}\n` +
        `📅 *Berakhir:* ${sewa.expired_date}\n` +
        `⏳ *Sisa:* ${sisaHari} ${sisaHari === '∞' ? '' : `hari ${sisaJam} jam`}\n\n` +
        `📍 *Daerah Terdaftar:*\n${daerahList}\n\n` +
        `💡 Sewa baru: /sewa\n` +
        `📍 Tambah daerah: /tambah`,
        { parse_mode: 'Markdown' }
    );
};

// ==========================================
// 🔥 FUNGSI TAMBAH DAERAH
// ==========================================

const tambahDaerah = async (chatId, text, sendMessage) => {
    try {
        const match = text.match(/^\/tambah\s+(.+?)\s*>\s*(.+?)\s*>\s*(.+)$/i);
        if (!match) {
            return sendMessage(chatId, 
                `❌ *Format salah!*\n\n` +
                `Gunakan format:\n` +
                `/tambah KABUPATEN  KECAMATAN  KELURAHAN\n\n` +
                `📌 *Contoh:*\n` +
                `/tambah AMPAR  AMPARID  PISANG`,
                { parse_mode: 'Markdown' }
            );
        }
        
        const kabupaten = match[1].trim().toUpperCase();
        const kecamatan = match[2].trim().toUpperCase();
        const kelurahan = match[3].trim().toUpperCase();
        const daerahFormatted = `${kabupaten} > ${kecamatan} > ${kelurahan}`;
        
        const sewaFile = path.join(__dirname, 'wa-bot', 'sewa_aktif.json');
        let sewaData = {};
        if (fs.existsSync(sewaFile)) {
            try { sewaData = JSON.parse(fs.readFileSync(sewaFile, 'utf8')); } catch (e) {}
        }
        
        const sewa = sewaData[chatId];
        
        if (!sewa || !sewa.active) {
            return sendMessage(chatId, 
                `❌ *Sewa tidak aktif!*\n\n` +
                `Silahkan sewa dulu dengan /sewa\n` +
                `Baru bisa tambah daerah.`,
                { parse_mode: 'Markdown' }
            );
        }
        
        const now = Date.now();
        const expired = sewa.expired === 'Forever' ? Infinity : sewa.expired;
        if (expired !== Infinity && now >= expired) {
            return sendMessage(chatId, 
                `❌ *Sewa sudah EXPIRED!*\n\n` +
                `Silahkan perpanjang dengan /sewa`,
                { parse_mode: 'Markdown' }
            );
        }
        
        if (!sewaData[chatId].daerah) {
            sewaData[chatId].daerah = [];
        }
        
        if (sewaData[chatId].daerah.includes(daerahFormatted)) {
            return sendMessage(chatId, 
                `⚠️ *Daerah sudah terdaftar!*\n\n` +
                `📍 ${daerahFormatted}\n\n` +
                `Gunakan /daerahsaya untuk lihat semua daerah.`,
                { parse_mode: 'Markdown' }
            );
        }
        
        sewaData[chatId].daerah.push(daerahFormatted);
        fs.writeFileSync(sewaFile, JSON.stringify(sewaData, null, 2));
        console.log(`✅ [TAMBAH DAERAH] ${daerahFormatted} untuk ${chatId}`);
        
        await syncDaerahToWABot(chatId, daerahFormatted);
        
        const msg = `✅ *DAERAH BERHASIL DITAMBAHKAN!*\n\n` +
            `📍 ${daerahFormatted}\n\n` +
            `📊 *Total daerah terdaftar:* ${sewaData[chatId].daerah.length}\n\n` +
            `📌 WA-Bot akan mulai mendeteksi data dari grup\n` +
            `untuk daerah ini.\n\n` +
            `💡 *Untuk menambah lagi:*\n` +
            `/tambah KABUPATEN  KECAMATAN  KELURAHAN`;
        
        await sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('❌ Tambah daerah error:', error);
        sendMessage(chatId, '❌ Gagal menambah daerah.');
    }
};

// ==========================================
// 🔥 FUNGSI LIHAT DAERAH SAYA
// ==========================================

const daerahSaya = async (chatId, sendMessage) => {
    const sewa = getSewa(chatId);
    
    if (!sewa || !sewa.daerah || sewa.daerah.length === 0) {
        return sendMessage(chatId, 
            `📍 *Belum ada daerah terdaftar*\n\n` +
            `Tambahkan dengan:\n` +
            `/tambah KABUPATEN  KECAMATAN  KELURAHAN`,
            { parse_mode: 'Markdown' }
        );
    }
    
    let daftar = '';
    sewa.daerah.forEach((d, i) => {
        daftar += `${i+1}. ${d}\n`;
    });
    
    const username = sewa.username || chatId;
    
    return sendMessage(chatId, 
        `📍 *DAFTAR DAERAH TERDAFTAR*\n\n` +
        `👤 *User:* ${username}\n` +
        `📦 Paket: ${sewa.duration}\n` +
        `📅 Aktif sampai: ${sewa.expired_date}\n` +
        `📊 Total: ${sewa.daerah.length} daerah\n\n` +
        `📋 *Daftar:*\n${daftar}\n\n` +
        `💡 *Tambah lagi:* /tambah`,
        { parse_mode: 'Markdown' }
    );
};

// ==========================================
// 🔥 HANDLE SEWA COMMAND
// ==========================================

const handleSewaCommand = async (msg, bot, sendMessage, sendNewMessage) => {
    const chatId = msg.chat.id;
    const text = msg.text || '';
    
    if (text === '/sewa') {
        return showSewaBotMenu(chatId, sendNewMessage, bot);
    }
    
    if (text === '🔙 BACK MENU') {
        await deleteAllMessages(bot, chatId);
        await removeReplyKeyboard(bot, chatId);
        
        try {
            const menuModule = require('./menu.js');
            if (!menuModule.hasSeenWelcome(chatId)) {
                const username = chatId.toString();
                return menuModule.showWelcomeScreen(chatId, username, sendNewMessage, bot);
            }
            await menuModule.showMenu(chatId, false, {}, sendNewMessage, bot);
        } catch (e) {
            await sendNewMessage(chatId, 
                `📋 *MENU UTAMA*\n\nPilih menu di bawah:`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "📊PROFIL", callback_data: "profil_menu" }],
                            [{ text: "📍TAMBAH DAERAH", callback_data: "tambah_daerah" }, { text: "🤖SEWA BOT", callback_data: "sewa_menu" }],
                            [{ text: "♲REFRESH♲", callback_data: "back_to_main" }]
                        ]
                    }
                }
            );
        }
        return;
    }
    
    if (text.match(/^\/tambah\s+/i)) {
        return await tambahDaerah(chatId, text, sendMessage);
    }
    
    if (text === '/daerahsaya' || text === '/daerah_saya') {
        return await daerahSaya(chatId, sendMessage);
    }
    
    // 🔥 FIX: CEK APAKAH SUDAH ADA FLAG PROCESSING
    if (processingFlags[chatId]) {
        console.log(`⚠️ [HANDLE] Duplicate command from ${chatId}, ignoring...`);
        await sendMessage(chatId, 
            `⏳ *Proses sedang berjalan...*\n\n` +
            `Mohon tunggu sebentar, jangan klik tombol berulang kali.`,
            { parse_mode: 'Markdown' }
        );
        return;
    }
    
    if (text === '1 Minggu - Rp1') {
        const duration = '1minggu';
        const info = HARGA_SEWA[duration];
        if (info) {
            await processSewa(chatId, info.label, info.price, info.days, bot, sendMessage, sendNewMessage);
        }
        return;
    }
    
    if (text === '1 Bulan - Rp100.000') {
        const duration = '1bulan';
        const info = HARGA_SEWA[duration];
        if (info) {
            await processSewa(chatId, info.label, info.price, info.days, bot, sendMessage, sendNewMessage);
        }
        return;
    }
    
    if (text === '1 Tahun - Rp500.000') {
        const duration = '1tahun';
        const info = HARGA_SEWA[duration];
        if (info) {
            await processSewa(chatId, info.label, info.price, info.days, bot, sendMessage, sendNewMessage);
        }
        return;
    }
    
    if (text === '📊 CEK SEWA') {
        await cekSewa(chatId, sendMessage);
        return;
    }
    
    if (text === '📍 DAERAH SAYA') {
        await daerahSaya(chatId, sendMessage);
        return;
    }
    
    const match = text.match(/^\/sewa\s+(1minggu|1bulan|1tahun)$/i);
    if (match) {
        const duration = match[1].toLowerCase();
        const info = HARGA_SEWA[duration];
        if (!info) {
            return sendMessage(chatId, '❌ Paket tidak valid');
        }
        
        const cleanPrice = parseInt(info.price) || 0;
        if (cleanPrice <= 0) {
            return sendMessage(chatId, '❌ Harga paket tidak valid!', { parse_mode: 'Markdown' });
        }
        
        await processSewa(chatId, info.label, cleanPrice, info.days, bot, sendMessage, sendNewMessage);
        return;
    }
    
    if (text === '/ceksewa') {
        await cekSewa(chatId, sendMessage);
        return;
    }
    
    if (text === '/batalkan') {
        if (pendingSewa[chatId]) {
            stopAutoCheck(chatId);
            delete pendingSewa[chatId];
            sendMessage(chatId, '🥲');
        } else {
            sendMessage(chatId, '❌ Tidak ada transaksi pending');
        }
        return;
    }
};

// ==========================================
// 🔥 HANDLE SEWA CALLBACK - FIX DOUBLE PROCESS
// ==========================================

const handleSewaCallback = async (q, bot, sendMessage, sendNewMessage) => {
    const chatId = q.message.chat.id;
    const data = q.data;
    
    if (data === 'back_to_menu') {
        await deleteAllMessages(bot, chatId);
        try {
            await bot.deleteMessage(chatId, q.message.message_id);
        } catch (e) {}

        await removeReplyKeyboard(bot, chatId);
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const menuModule = require('./menu.js');
            if (!menuModule.hasSeenWelcome(chatId)) {
                const username = chatId.toString();
                return menuModule.showWelcomeScreen(chatId, username, sendNewMessage, bot);
            }
            await menuModule.showMenu(chatId, false, {}, sendNewMessage, bot);
        } catch (e) {
            await sendNewMessage(chatId, 
                `📋 *MENU UTAMA*\n\nPilih menu di bawah:`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "📊PROFIL", callback_data: "profil_menu" }],
                            [{ text: "📍TAMBAH DAERAH", callback_data: "tambah_daerah" }, { text: "🤖SEWA BOT", callback_data: "sewa_menu" }],
                            [{ text: "♲REFRESH♲", callback_data: "back_to_main" }]
                        ]
                    }
                }
            );
        }
        return true;
    }
    
    // 🔥 CEK FLAG PROCESSING UNTUK CALLBACK
    if (processingFlags[chatId]) {
        console.log(`⚠️ [CALLBACK] Duplicate callback from ${chatId}, ignoring...`);
        await sendMessage(chatId, 
            `⏳ *Proses sedang berjalan...*\n\n` +
            `Mohon tunggu sebentar, jangan klik tombol berulang kali.`,
            { parse_mode: 'Markdown' }
        );
        return true;
    }
    
    if (data.startsWith('sewa_')) {
        const duration = data.replace('sewa_', '');
        const info = HARGA_SEWA[duration];
        if (!info) {
            sendMessage(chatId, '❌ Paket tidak valid');
            return true;
        }
        
        await processSewa(chatId, info.label, info.price, info.days, bot, sendMessage, sendNewMessage);
        return true;
    }
    
    if (data === 'cek_sewa') {
        await cekSewa(chatId, sendMessage);
        return true;
    }
    
    if (data === 'daerah_saya') {
        await daerahSaya(chatId, sendMessage);
        return true;
    }
    
    if (data === 'tambah_daerah') {
        const menuModule = require('./menu.js');
        await menuModule.startTambahDaerah(chatId, bot, sendMessage);
        return true;
    }
    
    if (data === 'ceksewa') {
        const trx = pendingSewa[chatId];
        if (!trx) {
            sendMessage(chatId, '❌ Tidak ada transaksi pending');
            return true;
        }
        
        await sendMessage(chatId, 
            `🔄 *Mengecek pembayaran...*\n\n` +
            `📦 Paket: ${trx.duration}\n` +
            `💰 Target: Rp${formatRupiah(trx.originalAmount)}\n` +
            `⏳ Mohon tunggu sebentar...`,
            { parse_mode: 'Markdown' }
        );
        
        const result = await payment.cekStatusDual(
            trx.transaction_id,
            trx.originalAmount,
            trx.method || 'AUTOGOPAY',
            trx.created_at
        );
        
        if (result.matched || result.status === 'settlement' || result.status === 'success' || result.status === 'paid') {
            await deleteQRMessage(bot, chatId);
            const username = q?.from?.username || chatId.toString();
            const sewa = await aktifkanSewa(chatId, trx.duration, trx.days, username);
            delete pendingSewa[chatId];
            stopAutoCheck(chatId);

            let usernameTele = username || chatId.toString();
            try {
                const userInfo = await bot.getChat(chatId);
                if (userInfo && userInfo.username) {
                    usernameTele = `@${userInfo.username}`;
                } else if (userInfo && userInfo.first_name) {
                    usernameTele = userInfo.first_name;
                }
            } catch (e) {}

            await sendNotifToChannel(bot,
                `🎉 *SEWA BERHASIL!*\n\n` +
                `👤 User: ${usernameTele}\n` +
                `🆔 ID: ${chatId}\n` +
                `📦 Paket: ${trx.duration}\n` +
                `💰 Harga: Rp${formatRupiah(trx.price)}\n` +
                `📅 Aktif sampai: ${sewa.expired_date}\n\n` +
                `✅ Status: AKTIF`
            );

            const now = Date.now();
            const expired = sewa.expired === 'Forever' ? Infinity : sewa.expired;
            let sisaHari = 0;
            let sisaJam = 0;
            if (expired === Infinity) {
                sisaHari = '∞';
                sisaJam = '';
            } else {
                const sisaMs = expired - now;
                sisaHari = Math.ceil(sisaMs / (1000 * 60 * 60 * 24));
                sisaJam = Math.floor((sisaMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            }

            const msg = `<blockquote>✅ SEWA BERHASIL DIAKTIFKAN!...

📦 Paket: ${trx.duration}
💰 Harga: Rp${formatRupiah(trx.price)}
📅 Mulai: ${sewa.start_date}
📅 Berakhir: ${sewa.expired_date}
⏳ Sisa: ${sisaHari} hari ${sisaJam} jam
👤 User: ${username}

📌 Data sudah sync ke WA-Bot!
Bot akan mendeteksi data dari grup sesuai daerah Anda.</blockquote>`;

            const options = {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📍 TAMBAH DAERAH", callback_data: "tambah_daerah" }],
                        [{ text: "📊 CEK SEWA", callback_data: "cek_sewa" }],
                        [{ text: "🔙 KEMBALI KE MENU", callback_data: "back_to_menu" }]
                    ]
                }
            };

            await sendMessage(chatId, msg, options);
            
            notifyOwner(bot, `✅ SEWA + SYNC\n👤 ${chatId}\n📦 ${trx.duration}\n💰 Rp${formatRupiah(trx.price)}`);
            
        } else {
            let msg = '⏳ Masih pending. Pastikan sudah bayar sesuai total.';
            if (result.error) msg += `\n\n❌ Error: ${result.error}`;
            
            msg += `\n\n📊 *Informasi:*\n`;
            msg += `├ Target: Rp${formatRupiah(trx.originalAmount)}\n`;
            msg += `└ Total: Rp${formatRupiah(trx.amount)}`;
            
            msg += `\n\n💡 *Tips:*\n`;
            msg += `1. Pastikan sudah bayar sesuai total (Rp${formatRupiah(trx.amount)})\n`;
            msg += `2. Tunggu 1-2 menit setelah bayar\n`;
            msg += `3. Klik tombol Cek Pembayaran lagi`;
            
            sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        }
        return true;
    }
    
    if (data === 'batalkan_sewa') {
        stopAutoCheck(chatId);
        await deleteQRMessage(bot, chatId);
        delete pendingSewa[chatId];
        sendMessage(chatId, '🥲');
        return true;
    }
    
    return false;
};

// ==========================================
// 🔥 EXPORT
// ==========================================

module.exports = {
    showSewaBotMenu,
    processSewa,
    handleSewaCommand,
    handleSewaCallback,
    cekSewa,
    getSewa,
    aktifkanSewa,
    pendingSewa,
    generateQRIS,
    tambahDaerah,
    daerahSaya,
    syncSewaToWABot,
    syncDaerahToWABot,
    startAutoCheck,
    stopAutoCheck,
    removeReplyKeyboard
};