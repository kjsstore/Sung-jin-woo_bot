// ==========================================
// 🔥 BRIDGE TELEGRAM - WHATSAPP (FULL INTEGRASI + FORCE SYNC)
// ==========================================

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require("./config");

const app = express();
app.use(express.json());

const WA_API_URL = "http://127.0.0.1:3005";
const TELEGRAM_CHAT_ID = config.BOT.OWNER_ID.toString();

// ==========================================
// 🔥 PATH FILE UNTUK SEWA & DAERAH
// ==========================================

const SEWA_FILE = path.join(__dirname, 'sewa_aktif.json');
const DAERAH_FILE = path.join(__dirname, 'daerah_user.json');

// Path untuk WA-Bot
const WA_BOT_PATH = process.env.WA_BOT_PATH || path.join(__dirname, '../wabot');
const WA_DATA_FOLDER = path.join(WA_BOT_PATH, 'data');
const SEWA_FILE_WA = path.join(WA_DATA_FOLDER, 'sewa_aktif.json');
const DAERAH_FILE_WA = path.join(WA_DATA_FOLDER, 'daerah_user.json');

// ==========================================
// 🔥 FUNGSI LOAD/SAVE SEWA DATA
// ==========================================

function loadSewaData() {
    try {
        if (fs.existsSync(SEWA_FILE)) {
            const raw = fs.readFileSync(SEWA_FILE, 'utf8');
            if (!raw || raw.trim() === '') {
                return {};
            }
            return JSON.parse(raw);
        }
        return {};
    } catch (e) {
        console.log('⚠️ [SEWA] Corrupt, membuat baru:', e.message);
        return {};
    }
}

function saveSewaData(data) {
    try {
        // 1. Save lokal
        fs.writeFileSync(SEWA_FILE, JSON.stringify(data, null, 2));
        console.log(`✅ [SEWA] Saved lokal: ${SEWA_FILE}`);
        
        // 2. Save ke WA-Bot (PASTIKAN FOLDER ADA)
        if (!fs.existsSync(WA_DATA_FOLDER)) {
            console.log(`📁 [SEWA] Membuat folder: ${WA_DATA_FOLDER}`);
            fs.mkdirSync(WA_DATA_FOLDER, { recursive: true });
        }
        fs.writeFileSync(SEWA_FILE_WA, JSON.stringify(data, null, 2));
        console.log(`✅ [SEWA] Saved WA-Bot: ${SEWA_FILE_WA}`);
        console.log(`📊 [SEWA] Total users di WA-Bot: ${Object.keys(data).length}`);
        
        // 3. Kirim ke API WA-Bot
        try {
            axios.post(`${WA_API_URL}/api/sync-sewa-data`, {
                sewaData: data,
                timestamp: Date.now()
            }, { timeout: 3000 }).catch(() => {});
            console.log('✅ [SEWA] Terkirim ke API WA-Bot');
        } catch (e) {
            console.log('⚠️ [SEWA] API WA-Bot tidak merespon');
        }
        
        return { success: true };
    } catch (error) {
        console.error('❌ [SEWA] Save error:', error.message);
        return { success: false, error: error.message };
    }
}

// ==========================================
// 🔥 FUNGSI LOAD/SAVE DAERAH DATA
// ==========================================

function loadDaerahData() {
    try {
        if (fs.existsSync(DAERAH_FILE)) {
            const raw = fs.readFileSync(DAERAH_FILE, 'utf8');
            if (!raw || raw.trim() === '') {
                return {};
            }
            return JSON.parse(raw);
        }
        return {};
    } catch (e) {
        console.log('⚠️ [DAERAH] Corrupt, membuat baru:', e.message);
        return {};
    }
}

function saveDaerahData(data) {
    try {
        // 1. Save lokal
        fs.writeFileSync(DAERAH_FILE, JSON.stringify(data, null, 2));
        console.log(`✅ [DAERAH] Saved lokal: ${DAERAH_FILE}`);
        
        // 2. Save ke WA-Bot
        if (!fs.existsSync(WA_DATA_FOLDER)) {
            fs.mkdirSync(WA_DATA_FOLDER, { recursive: true });
        }
        fs.writeFileSync(DAERAH_FILE_WA, JSON.stringify(data, null, 2));
        console.log(`✅ [DAERAH] Saved WA-Bot: ${DAERAH_FILE_WA}`);
        
        // 3. Kirim ke API WA-Bot
        try {
            axios.post(`${WA_API_URL}/api/sync-daerah-data`, {
                daerahData: data,
                timestamp: Date.now()
            }, { timeout: 3000 }).catch(() => {});
        } catch (e) {
            console.log('⚠️ [DAERAH] API WA-Bot tidak merespon');
        }
        
        return { success: true };
    } catch (error) {
        console.error('❌ [DAERAH] Save error:', error.message);
        return { success: false, error: error.message };
    }
}

// ==========================================
// 🔥 FUNGSI FORCE SYNC KE WA-BOT
// ==========================================

async function forceSyncToWABot() {
    try {
        console.log('🔄 [FORCE SYNC] Mengirim semua data ke WA-Bot...');
        
        const sewaData = loadSewaData();
        const daerahData = loadDaerahData();
        
        // 1. Save ke WA-Bot
        if (!fs.existsSync(WA_DATA_FOLDER)) {
            console.log(`📁 [FORCE SYNC] Membuat folder: ${WA_DATA_FOLDER}`);
            fs.mkdirSync(WA_DATA_FOLDER, { recursive: true });
        }
        
        fs.writeFileSync(SEWA_FILE_WA, JSON.stringify(sewaData, null, 2));
        fs.writeFileSync(DAERAH_FILE_WA, JSON.stringify(daerahData, null, 2));
        
        console.log(`✅ [FORCE SYNC] SEWA: ${Object.keys(sewaData).length} users`);
        console.log(`✅ [FORCE SYNC] DAERAH: ${Object.keys(daerahData).length} users`);
        
        // 2. Kirim ke API WA-Bot
        try {
            await axios.post(`${WA_API_URL}/api/sync-sewa-data`, {
                sewaData: sewaData,
                daerahData: daerahData,
                timestamp: Date.now()
            }, { timeout: 5000 });
            console.log('✅ [FORCE SYNC] Terkirim ke API WA-Bot');
        } catch (e) {
            console.log('⚠️ [FORCE SYNC] API WA-Bot tidak merespon:', e.message);
        }
        
        // 3. Kirim force reload ke WA-Bot
        try {
            await axios.post(`${WA_API_URL}/api/force-reload`, {
                timestamp: Date.now()
            }, { timeout: 3000 });
            console.log('✅ [FORCE SYNC] Force reload WA-Bot berhasil');
        } catch (e) {
            console.log('⚠️ [FORCE SYNC] Force reload WA-Bot gagal:', e.message);
        }
        
        return { success: true };
    } catch (error) {
        console.error('❌ [FORCE SYNC] Error:', error.message);
        return { success: false, error: error.message };
    }
}

// ==========================================
// 🔥🔥🔥 FUNGSI UTAMA: TAMBAH/UPDATE USER SEWA
// ==========================================

function addOrUpdateSewa(chatId, duration, expired, startDate, expiredDate) {
    try {
        let sewaData = loadSewaData();
        
        // 🔥 PASTIKAN CHAT ID STRING
        const chatIdStr = chatId.toString();
        
        sewaData[chatIdStr] = {
            active: true,
            expired: expired || 'Forever',
            daerah: sewaData[chatIdStr]?.daerah || [],
            duration: duration,
            start_date: startDate || new Date().toISOString().split('T')[0],
            expired_date: expiredDate || 'Forever'
        };
        
        saveSewaData(sewaData);
        
        console.log(`✅ [SEWA] User ${chatIdStr} diupdate: ${duration}`);
        
        // 🔥 FORCE SYNC KE WA-BOT
        setTimeout(async () => {
            await forceSyncToWABot();
        }, 1000);
        
        return { success: true, data: sewaData[chatIdStr] };
    } catch (error) {
        console.error('❌ [SEWA] Update error:', error.message);
        return { success: false, error: error.message };
    }
}

// ==========================================
// 🔥🔥🔥 FUNGSI UTAMA: TAMBAH DAERAH KE USER
// ==========================================

function addDaerahToUser(chatId, daerahBaru) {
    try {
        const chatIdStr = chatId.toString();
        let sewaData = loadSewaData();
        let daerahData = loadDaerahData();
        
        if (!sewaData[chatIdStr]) {
            return { 
                success: false, 
                error: 'User tidak ditemukan. Silahkan sewa dulu!' 
            };
        }
        
        if (!sewaData[chatIdStr].daerah) {
            sewaData[chatIdStr].daerah = [];
        }
        
        if (sewaData[chatIdStr].daerah.includes(daerahBaru)) {
            return { 
                success: false, 
                error: `Daerah "${daerahBaru}" sudah terdaftar!` 
            };
        }
        
        // 🔥 TAMBAH DAERAH
        sewaData[chatIdStr].daerah.push(daerahBaru);
        saveSewaData(sewaData);
        
        if (!daerahData[chatIdStr]) {
            daerahData[chatIdStr] = [];
        }
        daerahData[chatIdStr].push({
            daerah: daerahBaru,
            addedAt: Date.now()
        });
        saveDaerahData(daerahData);
        
        console.log(`✅ [DAERAH] Ditambahkan untuk ${chatIdStr}: ${daerahBaru}`);
        console.log(`📊 [DAERAH] Total: ${sewaData[chatIdStr].daerah.length}`);
        
        // 🔥🔥🔥 FORCE SYNC KE WA-BOT
        setTimeout(async () => {
            console.log(`🔄 [DAERAH] Force sync ke WA-Bot untuk daerah: ${daerahBaru}`);
            await forceSyncToWABot();
        }, 1500);
        
        return { 
            success: true, 
            data: sewaData[chatIdStr],
            totalDaerah: sewaData[chatIdStr].daerah.length
        };
    } catch (error) {
        console.error('❌ [DAERAH] Add error:', error.message);
        return { success: false, error: error.message };
    }
}

// ==========================================
// 🔥 FUNGSI KIRIM KE TELEGRAM
// ==========================================

async function sendToTelegram(message, parseMode = 'Markdown') {
    try {
        const bot = global.telegramBot;
        if (!bot) {
            console.log('⚠️ [BRIDGE] Bot not initialized');
            return false;
        }
        
        // 🔥 CLEANUP MESSAGE UNTUK HINDARI ERROR
        let cleanMessage = message || '';
        if (parseMode === 'Markdown') {
            cleanMessage = cleanMessage.replace(/\*([^*]*)$/, '$1');
            cleanMessage = cleanMessage.replace(/_([^_]*)$/, '$1');
            cleanMessage = cleanMessage.replace(/`([^`]*)$/, '$1');
            cleanMessage = cleanMessage.replace(/\[([^\]]*)$/, '$1');
        }
        
        await bot.sendMessage(TELEGRAM_CHAT_ID, cleanMessage, { parse_mode: parseMode });
        console.log(`✅ [BRIDGE] Pesan terkirim ke Telegram`);
        return true;
    } catch (error) {
        console.log('❌ [BRIDGE ERROR]', error.message);
        return false;
    }
}

async function sendToTelegramUser(chatId, message, reply_markup = null) {
    try {
        const bot = global.telegramBot;
        if (!bot) {
            console.log('⚠️ [BRIDGE] Bot not initialized');
            return false;
        }
        
        // 🔥 CLEANUP MESSAGE
        let cleanMessage = message || '';
        cleanMessage = cleanMessage.replace(/\*([^*]*)$/, '$1');
        cleanMessage = cleanMessage.replace(/_([^_]*)$/, '$1');
        cleanMessage = cleanMessage.replace(/`([^`]*)$/, '$1');
        cleanMessage = cleanMessage.replace(/\[([^\]]*)$/, '$1');
        
        const options = { parse_mode: 'Markdown' };
        if (reply_markup) {
            options.reply_markup = reply_markup;
        }
        
        await bot.sendMessage(chatId, cleanMessage, options);
        console.log(`✅ [BRIDGE] Pesan terkirim ke user ${chatId}`);
        return true;
    } catch (error) {
        console.log(`❌ [BRIDGE] Gagal kirim ke user ${chatId}:`, error.message);
        return false;
    }
}
// ==========================================
// 🔥 ENDPOINT: PAIRING STATUS
// ==========================================

app.get('/pair-status', async (req, res) => {
    try {
        const response = await axios.get(`${WA_API_URL}/api/pairing-status`, {
            timeout: 3000
        });
        
        res.json({
            status: 'success',
            data: response.data
        });
    } catch (error) {
        console.log('[PAIR-STATUS] Error:', error.message);
        res.json({
            status: 'error',
            connected: false,
            message: error.message
        });
    }
});

// ==========================================
// 🔥 ENDPOINT: PAIRING
// ==========================================

app.post('/pair', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        console.log(`📱 [BRIDGE] Pairing request: ${phoneNumber}`);
        
        const response = await axios.post(`${WA_API_URL}/pair`, {
            phoneNumber: phoneNumber
        }, { timeout: 30000 });
        
        res.json({
            status: 'success',
            data: response.data
        });
    } catch (error) {
        console.log('[BRIDGE] Pair error:', error.message);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// ==========================================
// 🔥 ENDPOINT: REPAIR
// ==========================================

app.post('/repair', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        console.log(`🔧 [BRIDGE] Repair request: ${phoneNumber}`);
        
        const response = await axios.post(`${WA_API_URL}/repair`, {
            phoneNumber: phoneNumber
        }, { timeout: 30000 });
        
        res.json({
            status: 'success',
            data: response.data
        });
    } catch (error) {
        console.log('[BRIDGE] Repair error:', error.message);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// ==========================================
// 🔥 ENDPOINT: ADD/UPDATE SEWA
// ==========================================

app.post('/add-sewa', async (req, res) => {
    try {
        const { chatId, duration, expired, startDate, expiredDate } = req.body;
        
        if (!chatId || !duration) {
            return res.status(400).json({
                status: 'error',
                message: 'chatId and duration required'
            });
        }
        
        console.log(`📝 [API] Add sewa for ${chatId}: ${duration}`);
        
        const result = addOrUpdateSewa(
            chatId.toString(),
            duration,
            expired || 'Forever',
            startDate || new Date().toISOString().split('T')[0],
            expiredDate || 'Forever'
        );
        
        if (result.success) {
            await sendToTelegramUser(chatId,
                `✅ *SEWA BERHASIL DI TAMBAHKAN!*\n\n` +
                `📦 Paket: ${duration}\n` +
                `📅 Mulai: ${result.data.start_date}\n` +
                `📅 Berakhir: ${result.data.expired_date}\n\n` +
                `📍 *Sekarang tambahkan daerah:*\n` +
                `/tambah KABUPATEN > KECAMATAN > KELURAHAN\n\n` +
                `📌 Contoh: /tambah SUMENEP > PRAGAAN > PAKAMBAN DAYA`
            );
            
            await sendToTelegram(
                `✅ *SEWA DITAMBAHKAN*\n\n` +
                `👤 User: ${chatId}\n` +
                `📦 Paket: ${duration}\n` +
                `📅 Berakhir: ${result.data.expired_date}\n` +
                `📁 File: sewa_aktif.json (tersync ke WA-Bot)`
            );
            
            res.json({
                status: 'success',
                message: 'Sewa berhasil ditambahkan',
                data: result.data
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: result.error
            });
        }
    } catch (error) {
        console.log('[API] Add sewa error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 🔥 ENDPOINT: TAMBAH DAERAH
// ==========================================

app.post('/add-daerah', async (req, res) => {
    try {
        const { chatId, kabupaten, kecamatan, kelurahan } = req.body;
        
        if (!chatId || !kabupaten || !kecamatan || !kelurahan) {
            return res.status(400).json({
                status: 'error',
                message: 'chatId, kabupaten, kecamatan, kelurahan required'
            });
        }
        
        const daerahFormatted = `${kabupaten.toUpperCase()} > ${kecamatan.toUpperCase()} > ${kelurahan.toUpperCase()}`;
        
        console.log(`📝 [API] Add daerah for ${chatId}: ${daerahFormatted}`);
        
        const result = addDaerahToUser(chatId.toString(), daerahFormatted);
        
        if (result.success) {
            await sendToTelegramUser(chatId,
                `✅ *DAERAH BERHASIL DITAMBAHKAN!*\n\n` +
                `📍 ${daerahFormatted}\n` +
                `📊 Total daerah: ${result.totalDaerah}\n\n` +
                `📌 WA-Bot akan mulai mendeteksi data dari grup!\n` +
                `💡 Tambah lagi: /tambah KABUPATEN > KECAMATAN > KELURAHAN`
            );
            
            await sendToTelegram(
                `✅ *DAERAH DITAMBAHKAN*\n\n` +
                `👤 User: ${chatId}\n` +
                `📍 ${daerahFormatted}\n` +
                `📊 Total: ${result.totalDaerah} daerah\n` +
                `📁 File: sewa_aktif.json & daerah_user.json (tersync ke WA-Bot)`
            );
            
            res.json({
                status: 'success',
                message: 'Daerah berhasil ditambahkan',
                data: result.data,
                totalDaerah: result.totalDaerah
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: result.error
            });
        }
    } catch (error) {
        console.log('[API] Add daerah error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 🔥 ENDPOINT: FORCE SYNC KE WA-BOT
// ==========================================

app.post('/force-sync', async (req, res) => {
    try {
        console.log('📤 [API] Force sync diminta');
        const result = await forceSyncToWABot();
        
        if (result.success) {
            res.json({
                status: 'success',
                message: 'Force sync berhasil',
                sewa_file: SEWA_FILE_WA,
                daerah_file: DAERAH_FILE_WA
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: result.error
            });
        }
    } catch (error) {
        console.log('[API] Force sync error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 🔥 ENDPOINT: GET ALL USERS
// ==========================================

app.get('/get-all-sewa', async (req, res) => {
    try {
        const sewaData = loadSewaData();
        res.json({
            status: 'success',
            total: Object.keys(sewaData).length,
            data: sewaData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 🔥 ENDPOINT: SYNC MASSAL KE WA-BOT
// ==========================================

app.post('/sync-all-to-wabot', async (req, res) => {
    try {
        const { sewaData, daerahData } = req.body;
        
        console.log(`📤 [SYNC MASSAL] Menerima sync dari Telegram`);
        console.log(`📊 Total users: ${Object.keys(sewaData || {}).length}`);
        
        if (sewaData) {
            fs.writeFileSync(SEWA_FILE, JSON.stringify(sewaData, null, 2));
            console.log(`✅ [SYNC] Saved lokal: ${SEWA_FILE}`);
        }
        
        if (daerahData) {
            fs.writeFileSync(DAERAH_FILE, JSON.stringify(daerahData, null, 2));
            console.log(`✅ [SYNC] Saved lokal: ${DAERAH_FILE}`);
        }
        
        if (!fs.existsSync(WA_DATA_FOLDER)) {
            fs.mkdirSync(WA_DATA_FOLDER, { recursive: true });
        }
        
        if (sewaData) {
            fs.writeFileSync(SEWA_FILE_WA, JSON.stringify(sewaData, null, 2));
            console.log(`✅ [SYNC] Saved WA-Bot: ${SEWA_FILE_WA}`);
        }
        
        if (daerahData) {
            fs.writeFileSync(DAERAH_FILE_WA, JSON.stringify(daerahData, null, 2));
            console.log(`✅ [SYNC] Saved WA-Bot: ${DAERAH_FILE_WA}`);
        }
        
        try {
            await axios.post(`${WA_API_URL}/api/sync-sewa-data`, {
                sewaData: sewaData,
                daerahData: daerahData,
                timestamp: Date.now()
            }, { timeout: 5000 });
            console.log('✅ [SYNC] Terkirim ke API WA-Bot');
        } catch (apiError) {
            console.log('⚠️ [SYNC] API WA-Bot tidak merespon:', apiError.message);
        }
        
        res.json({
            status: 'success',
            message: 'Sync massal berhasil',
            total_users: Object.keys(sewaData || {}).length
        });
        
    } catch (error) {
        console.error('❌ [SYNC MASSAL] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 🔥 ENDPOINT: FORCE RELOAD WA-BOT (TAMBAHKAN INI)
// ==========================================

app.post('/api/force-reload', async (req, res) => {
    try {
        console.log('🔄 [API] Force reload WA-Bot...');
        
        // Kirim data terbaru ke WA-Bot
        const sewaData = loadSewaData();
        const daerahData = loadDaerahData();
        
        // Save ke file WA-Bot
        if (!fs.existsSync(WA_DATA_FOLDER)) {
            fs.mkdirSync(WA_DATA_FOLDER, { recursive: true });
        }
        fs.writeFileSync(SEWA_FILE_WA, JSON.stringify(sewaData, null, 2));
        fs.writeFileSync(DAERAH_FILE_WA, JSON.stringify(daerahData, null, 2));
        
        // Kirim ke API WA-Bot
        await axios.post(`${WA_API_URL}/api/sync-sewa-data`, {
            sewaData: sewaData,
            daerahData: daerahData,
            timestamp: Date.now()
        }, { timeout: 5000 });
        
        console.log(`✅ [API] Force reload berhasil: ${Object.keys(sewaData).length} users`);
        
        res.json({
            status: 'success',
            message: 'WA-Bot reloaded',
            total_users: Object.keys(sewaData).length
        });
    } catch (error) {
        console.error('❌ [API] Force reload error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 🔥 ENDPOINT: WA -> TELEGRAM
// ==========================================

app.post('/wa-to-telegram', async (req, res) => {
    try {
        const { message, from, isOwner, code, phoneNumber, data } = req.body;
        
        console.log(`[BRIDGE] Received:`, { message: message?.substring(0, 50), code, phoneNumber });
        
        if (code) {
            const formattedCode = code.toString().padStart(8, '0');
            await sendToTelegram(
                `📱 *PAIRING WHATSAPP*\n\n📞 Nomor: ${phoneNumber}\n🔑 Kode: *${formattedCode}*`,
                'Markdown'
            );
            return res.json({ status: 'ok', type: 'pairing_code', code: formattedCode });
        }
        
        if (data && data.type === 'region_detection') {
            const regionData = data.region;
            const daerahFormatted = `${regionData.kabupaten} > ${regionData.kecamatan} > ${regionData.kelurahan}`;
            
            console.log(`📊 [BRIDGE] Data daerah terdeteksi:`, daerahFormatted);
            
            const sewaData = loadSewaData();
            let targetUsers = [];
            
            for (const [chatId, user] of Object.entries(sewaData)) {
                if (user.active && user.daerah) {
                    const matched = user.daerah.some(d => 
                        d.includes(regionData.kabupaten) &&
                        d.includes(regionData.kecamatan) &&
                        d.includes(regionData.kelurahan)
                    );
                    if (matched) {
                        targetUsers.push({ chatId, user });
                    }
                }
            }
            
            if (targetUsers.length > 0) {
                for (const { chatId } of targetUsers) {
                    const msg = `📊 *DATA DARI WA GROUP*\n\n` +
                        `📍 *Daerah:* ${daerahFormatted}\n` +
                        `📱 *Sumber:* ${from || 'WhatsApp'}\n` +
                        `📝 *Pesan:*\n${message || 'Data terdeteksi'}\n\n` +
                        `🕐 ${new Date().toLocaleString('id-ID')}`;
                    
                    await sendToTelegramUser(chatId, msg);
                    console.log(`✅ [BRIDGE] Data dikirim ke ${chatId}`);
                }
                
                await sendToTelegram(
                    `📊 *DATA TERDETEKSI*\n\n` +
                    `📍 ${daerahFormatted}\n` +
                    `👥 Dikirim ke ${targetUsers.length} user\n` +
                    `📱 Dari: ${from}`
                );
                
                return res.json({ 
                    status: 'ok', 
                    type: 'region_detection',
                    delivered_to: targetUsers.length 
                });
            } else {
                console.log(`⚠️ [BRIDGE] Tidak ada user untuk daerah ini`);
                const pendingFile = path.join(__dirname, 'pending_data.json');
                let pending = [];
                if (fs.existsSync(pendingFile)) {
                    try { 
                        pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8')); 
                    } catch (e) {
                        console.log('⚠️ [BRIDGE] Pending file corrupt, buat baru');
                    }
                }
                pending.push({
                    region: regionData,
                    message: message,
                    from: from,
                    timestamp: Date.now()
                });
                fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));
                
                return res.json({ 
                    status: 'pending', 
                    message: 'No user registered for this region' 
                });
            }
        }
        
        const prefix = isOwner ? '👑 [OWNER] ' : '';
        const msg = `📱 ${from || 'WhatsApp'}\n${prefix}💬 ${message}`;
        await sendToTelegram(msg, 'Markdown');
        
        res.json({ status: 'ok' });
    } catch (error) {
        console.log('❌ [BRIDGE ERROR]', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 🔥 ENDPOINT: SEND TO TELEGRAM USER
// ==========================================

app.post('/send-to-telegram-user', async (req, res) => {
  try {
    const { chatId, message } = req.body;
    
    if (!chatId || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'chatId and message required'
      });
    }
    
    // 🔥 CLEANUP PESAN
    let cleanMessage = message || '';
    cleanMessage = cleanMessage.replace(/\*([^*]*)$/, '$1');
    cleanMessage = cleanMessage.replace(/_([^_]*)$/, '$1');
    cleanMessage = cleanMessage.replace(/`([^`]*)$/, '$1');
    cleanMessage = cleanMessage.replace(/\[([^\]]*)$/, '$1');
    cleanMessage = cleanMessage.replace(/\|/g, '');
    
    console.log(`[BRIDGE] 📤 Kirim ke user ${chatId}: ${cleanMessage.substring(0, 50)}...`);
    
    const bot = global.telegramBot;
    if (!bot) {
      console.log('[BRIDGE] ⚠️ Bot not initialized');
      return res.status(503).json({
        status: 'error',
        message: 'Bot not initialized'
      });
    }
    
    await bot.sendMessage(chatId, cleanMessage, { parse_mode: 'Markdown' });
    console.log(`[BRIDGE] ✅ Terkirim ke ${chatId}`);
    res.json({ status: 'success' });
    
  } catch (error) {
    console.log('[BRIDGE] ❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 🔥 ENDPOINT: SEND TO TELEGRAM USER WITH BUTTON
// ==========================================

app.post('/send-to-telegram-user-button', async (req, res) => {
  try {
    const { chatId, message, reply_markup } = req.body;
    
    if (!chatId || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'chatId and message required'
      });
    }
    
    console.log(`[BRIDGE] 📤 Kirim ke ${chatId} dengan button...`);
    
    // 🔥 CLEANUP MESSAGE (TAPI PERTAHANKAN FORMAT)
    let cleanMessage = message || '';
    cleanMessage = cleanMessage.replace(/\*([^*]*)$/, '$1');
    cleanMessage = cleanMessage.replace(/_([^_]*)$/, '$1');
    cleanMessage = cleanMessage.replace(/`([^`]*)$/, '$1');
    cleanMessage = cleanMessage.replace(/\[([^\]]*)$/, '$1');
    cleanMessage = cleanMessage.replace(/\|/g, '');
    
    // 🔥 CLEANUP URL DI REPLY_MARKUP
    let cleanReplyMarkup = reply_markup;
    if (cleanReplyMarkup && cleanReplyMarkup.inline_keyboard) {
      for (const row of cleanReplyMarkup.inline_keyboard) {
        for (const btn of row) {
          if (btn.url) {
            // Hapus karakter aneh dari URL
            btn.url = btn.url.replace(/\*/g, '');
            btn.url = btn.url.replace(/_/g, '');
            btn.url = btn.url.replace(/`/g, '');
            btn.url = btn.url.replace(/\|/g, '');
            // Encode URL dengan benar
            try {
              btn.url = encodeURI(btn.url);
            } catch (e) {}
          }
        }
      }
    }
    
    const bot = global.telegramBot;
    if (!bot) {
      console.log('[BRIDGE] ⚠️ Bot not initialized');
      return res.status(503).json({
        status: 'error',
        message: 'Bot not initialized'
      });
    }
    
    // 🔥 COBA KIRIM DENGAN BUTTON
    try {
      await bot.sendMessage(chatId, cleanMessage, {
        parse_mode: 'Markdown',
        reply_markup: cleanReplyMarkup
      });
      console.log(`[BRIDGE] ✅ Terkirim ke ${chatId} dengan button`);
      res.json({ status: 'success' });
    } catch (sendError) {
      console.log(`[BRIDGE] ❌ Gagal kirim:`, sendError.message);
      
      // 🔥 FALLBACK 1: TANPA PARSE_MODE TAPI BUTTON TETAP ADA
      try {
        await bot.sendMessage(chatId, cleanMessage, {
          reply_markup: cleanReplyMarkup
        });
        console.log(`[BRIDGE] ✅ Fallback terkirim ke ${chatId} dengan button`);
        res.json({ status: 'success', fallback: true });
      } catch (fallbackError) {
        console.log(`[BRIDGE] ❌ Fallback gagal:`, fallbackError.message);
        
        // 🔥 FALLBACK 2: KIRIM DENGAN BUTTON TAPI URL DIGANTI
        try {
          const simpleMarkup = {
            inline_keyboard: [
              [
                { 
                  text: "📋 Copy Data", 
                  callback_data: `copy_${Date.now()}`
                }
              ],
              [
                { 
                  text: "💬 ADMIN REKBER", 
                  url: "https://wa.me/6285811121679?text=Assalamualaikum%20Admin%2C%20saya%20member%20KJS%20Bot" 
                }
              ]
            ]
          };
          
          await bot.sendMessage(chatId, cleanMessage, {
            parse_mode: 'Markdown',
            reply_markup: simpleMarkup
          });
          console.log(`[BRIDGE] ✅ Simple button terkirim ke ${chatId}`);
          res.json({ status: 'success', fallback: true });
        } catch (lastError) {
          // 🔥 LAST RESORT: KIRIM PLAIN TANPA BUTTON
          await bot.sendMessage(chatId, cleanMessage);
          console.log(`[BRIDGE] ✅ Plain terkirim ke ${chatId}`);
          res.json({ status: 'success', fallback: true, no_button: true });
        }
      }
    }
    
  } catch (error) {
    console.log('[BRIDGE] ❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 🔥 ENDPOINT: STATUS
// ==========================================

app.get('/wa-status', async (req, res) => {
    try {
        const sewaData = loadSewaData();
        const daerahData = loadDaerahData();
        
        // Cek file WA-Bot
        let waSewaExists = fs.existsSync(SEWA_FILE_WA);
        let waDaerahExists = fs.existsSync(DAERAH_FILE_WA);
        
        res.json({
            bridge: 'running',
            wa_api: WA_API_URL,
            total_users: Object.keys(sewaData).length,
            total_regions: Object.values(sewaData).reduce((sum, u) => sum + (u.daerah?.length || 0), 0),
            files: {
                sewa: SEWA_FILE,
                sewa_wa: SEWA_FILE_WA,
                sewa_wa_exists: waSewaExists,
                daerah: DAERAH_FILE,
                daerah_wa: DAERAH_FILE_WA,
                daerah_wa_exists: waDaerahExists
            },
            wabot_folder: WA_DATA_FOLDER,
            wabot_folder_exists: fs.existsSync(WA_DATA_FOLDER)
        });
    } catch (error) {
        console.log('[STATUS] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 🔥 GET WA STATUS (UNTUK TELEGRAM BOT)
// ==========================================

const getWAStatus = async () => {
    try {
        const response = await axios.get(`${WA_API_URL}/api/pairing-status`, {
            timeout: 3000
        });
        
        if (response.data) {
            return {
                connected: response.data.connected || false,
                phone: response.data.phone || '-',
                contacts: 0,
                uptime: 0
            };
        }
        return null;
    } catch (error) {
        console.log('❌ [getWAStatus] Error:', error.message);
        return null;
    }
};

// ==========================================
// 🔥 ENDPOINT SEND QR - DENGAN TOMBOL BATAL
// ==========================================

const qrMessages = {};

app.post('/send-qr', async (req, res) => {
    try {
        const { qr, phone } = req.body;
        console.log(`📱 [QR] Menerima QR untuk ${phone}...`);
        
        const bot = global.telegramBot;
        if (!bot) {
            console.log('❌ [QR] Bot tidak tersedia!');
            return res.status(503).json({ error: 'Bot tidak tersedia' });
        }
        
        const qrBuffer = Buffer.from(qr, 'base64');
        
        // HAPUS PESAN LOADING
        try {
            if (global._loadingMsgId) {
                await bot.deleteMessage(TELEGRAM_CHAT_ID, global._loadingMsgId);
                console.log('🗑️ [QR] Pesan loading dihapus');
                global._loadingMsgId = null;
            }
        } catch (e) {}
        
        // 🔥 GENERATE KODE PAIRING (8 DIGIT)
        const pairCode = Math.floor(10000000 + Math.random() * 90000000).toString();
        
        // 🔥 KIRIM QR + KODE (KLIK KODE LANGSUNG COPY)
        const sent = await bot.sendPhoto(TELEGRAM_CHAT_ID, qrBuffer, {
            caption: `📱 *SCAN QR CODE*\n\n📞 ${phone}\n\n📌 WhatsApp > Perangkat Tertaut\n⏳ QR 3 menit\n\n🔑 *KODE PAIRING:* \`${pairCode}\`\n\n📌 *Klik kode di atas untuk copy*`,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ 
                        text: `${pairCode}`, 
                        callback_data: `copy_${pairCode}` 
                    }],
                    [{ text: "❌ BATAL", callback_data: `batal_pair_${phone}` }]
                ]
            }
        });
        
        console.log(`✅ [QR] QR + kode ${pairCode} terkirim!`);
        
        // AUTO DELETE QR SETELAH 3 MENIT
        const chatId = TELEGRAM_CHAT_ID;
        const messageId = sent.message_id;
        
        if (qrMessages[chatId]) {
            try {
                await bot.deleteMessage(chatId, qrMessages[chatId]);
                console.log('🗑️ [QR] QR lama dihapus');
            } catch (e) {}
            clearTimeout(qrMessages[`${chatId}_timer`]);
        }
        
        qrMessages[chatId] = messageId;
        
        const timer = setTimeout(async () => {
            try {
                await bot.deleteMessage(chatId, messageId);
                console.log('🗑️ [QR] QR + kode expired dan dihapus');
                delete qrMessages[chatId];
                
                await bot.sendMessage(chatId, 
                    `⏰ *QR & Kode expired!*\n📞 ${phone}\n🔄 Kirim ulang: /pairqr ${phone}`,
                    { parse_mode: 'Markdown' }
                );
            } catch (e) {
                console.log('⚠️ [QR] Gagal hapus:', e.message);
            }
            delete qrMessages[`${chatId}_timer`];
        }, 180000);
        
        qrMessages[`${chatId}_timer`] = timer;
        
        res.json({ status: 'success' });
        
    } catch (error) {
        console.log('❌ [QR] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 🔥 START SERVER
// ==========================================

const PORT = 3004;
app.listen(PORT, () => {
    console.log(`✅ [BRIDGE] Running on port ${PORT}`);
    console.log(`✅ [BRIDGE] WA API: ${WA_API_URL}`);
    console.log(`✅ [BRIDGE] Chat ID: ${TELEGRAM_CHAT_ID}`);
    console.log(`✅ [BRIDGE] SEWA FILE: ${SEWA_FILE}`);
    console.log(`✅ [BRIDGE] SEWA WA: ${SEWA_FILE_WA}`);
    console.log(`✅ [BRIDGE] DAERAH FILE: ${DAERAH_FILE}`);
    console.log(`✅ [BRIDGE] DAERAH WA: ${DAERAH_FILE_WA}`);
    console.log(`✅ [BRIDGE] WA DATA FOLDER: ${WA_DATA_FOLDER}`);
});

// ==========================================
// 🔥 EXPORT
// ==========================================

module.exports = { 
    sendToWhatsApp: async (phone, msg) => { 
        console.log(`[BRIDGE] sendToWhatsApp: ${phone} - ${msg}`);
        return true;
    },
    sendToTelegram,
    sendToTelegramUser,
    loadSewaData,
    saveSewaData,
    loadDaerahData,
    saveDaerahData,
    addOrUpdateSewa,
    addDaerahToUser,
    forceSyncToWABot,
    getWAStatus  // ✅ SEKARANG SUDAH TERDEFINISI SEBELUM DIPANGGIL
};