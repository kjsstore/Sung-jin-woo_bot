// ==========================================
// 🔥 INDEX.JS - MAIN BOT FILE (FULL LENGKAP - NO MARKDOWN)
// ==========================================

const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const axios = require("axios");
const path = require("path");

// ==========================================
// 🔥 IMPORT MODULES
// ==========================================

const config = require("./config");
const menu = require("./menu");
const sewaBot = require("./menu_sewa_bot");
const ownerMenu = require("./owner_menu");
const bridgeTelegram = require("./bridge-telegram");
const { 
  handleTambahDaerah,
  handleSyncCommand,
  removeReplyKeyboard,
  deleteAllMessages,
  showWelcomeScreen,
  hasSeenWelcome,
  handleWelcomeContinue
} = require("./menu");
const waMenu = require("./menu_wa");
const adminMenu = require("./menu_admin");

// ==========================================
// 🔥 BROADCAST HELPERS
// ==========================================

const broadcastHistory = {};

const tagAllUsers = (users) => {
    const ids = Object.keys(users);
    if (ids.length === 0) return '';
    return ids.map(id => `[${id}](tg://user?id=${id})`).join(' ');
};

const pinMessage = async (bot, chatId, messageId) => {
    try {
        await bot.pinChatMessage(chatId, messageId, { disable_notification: false });
        console.log(`📌 [PIN] Pesan disematkan untuk ${chatId}`);
        return true;
    } catch (error) {
        console.log(`⚠️ [PIN] Gagal semat: ${error.message}`);
        return false;
    }
};

// ==========================================
// 🔥 GLOBAL VARIABLES
// ==========================================

global.telegramBot = null;
const WA_API_URL = "http://localhost:3005";
const OWNER_ID = config.BOT.OWNER_ID;
const ADMIN_FILE = "./admins.json";

// ==========================================
// 🔥 BOT INIT
// ==========================================

const bot = new TelegramBot(config.BOT.TOKEN, { polling: true });
global.telegramBot = bot;

// ==========================================
// 🔥 FILE PATHS
// ==========================================

const USERS_FILE = "./users.json";
const SEWA_FILE = "./sewa_aktif.json";

// ==========================================
// 🔥 JSON HELPERS
// ==========================================

const loadJSON = (file) => {
  try {
    if (!fs.existsSync(file)) { fs.writeFileSync(file, "{}"); return {}; }
    const raw = fs.readFileSync(file, "utf8").trim();
    if (!raw || raw === "") { fs.writeFileSync(file, "{}"); return {}; }
    return JSON.parse(raw);
  } catch (err) {
    console.log(`❌ JSON ERROR ${file}:`, err.message);
    fs.writeFileSync(file, "{}");
    return {};
  }
};

const saveJSON = (file, data) => {
  try {
    if (!data || typeof data !== "object") data = {};
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.log(`❌ SAVE ERROR ${file}:`, err.message);
  }
};

// 🔥 ADMIN HELPER
const loadAdmins = () => {
    const data = loadJSON(ADMIN_FILE);
    return data.admins || [];
};

const saveAdmins = (admins) => {
    saveJSON(ADMIN_FILE, { admins });
};

const isAuthorized = (userId) => {
    if (userId === OWNER_ID) return true;
    const admins = loadAdmins();
    return admins.includes(userId.toString());
};

// ==========================================
// 🔥 LOAD DATA
// ==========================================

let users = loadJSON(USERS_FILE);

// ==========================================
// 🔥 HELPER FUNCTIONS
// ==========================================

function formatUptime(seconds) {
  if (!seconds) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ==========================================
// 🔥 ERROR HANDLING
// ==========================================

process.on("uncaughtException", (err) => {
  console.log("❌ ERROR CRASH:", err);
});
process.on("unhandledRejection", (err) => {
  console.log("❌ PROMISE ERROR:", err);
});

const log = (type, msg) => {
  const time = new Date().toLocaleString("id-ID");
  console.log(`[${time}] [${type}] ${msg}`);
};

log("INFO", "Bot Telegram aktif 🚀");

// ==========================================
// 🔥 SEND FUNCTIONS - FIXED NO MARKDOWN
// ==========================================

const lastMessages = {};

const deletePreviousMessage = async (chatId) => {
  if (lastMessages[chatId]) {
    try { await bot.deleteMessage(chatId, lastMessages[chatId]); } catch (err) {}
  }
};

const sendNewMessage = async (chatId, text, options = {}, bannerKey = null, photoUrl = null) => {
  try {
    await removeReplyKeyboard(bot, chatId);
    await deletePreviousMessage(chatId);
    
    let cleanText = text || '';
    cleanText = cleanText.replace(/\*/g, '').replace(/_/g, '').replace(/`/g, '').replace(/\[/g, '').replace(/\]/g, '').replace(/\(/g, '').replace(/\)/g, '').replace(/\|/g, '').trim();
    
    let sentMessage;
    if (photoUrl) {
      try {
        sentMessage = await bot.sendPhoto(chatId, photoUrl, {
          caption: cleanText,
          reply_markup: options.reply_markup
        });
      } catch (err) {
        sentMessage = await bot.sendMessage(chatId, cleanText);
      }
    } else {
      sentMessage = await bot.sendMessage(chatId, cleanText);
    }
    
    if (sentMessage && sentMessage.message_id) {
      lastMessages[chatId] = sentMessage.message_id;
    }
    return sentMessage;
  } catch (err) {
    log("ERROR", `sendNewMessage failed: ${err.message}`);
    return null;
  }
};

const sendPlainMessage = async (chatId, text, options = {}) => {
  try {
    await removeReplyKeyboard(bot, chatId);
    await deletePreviousMessage(chatId);
    
    let cleanText = text || '';
    cleanText = cleanText
      .replace(/\*/g, '')
      .replace(/_/g, '')
      .replace(/`/g, '')
      .replace(/\[/g, '')
      .replace(/\]/g, '')
      .replace(/\(/g, '')
      .replace(/\)/g, '')
      .replace(/\|/g, '')
      .trim();
    
    const sentMessage = await bot.sendMessage(chatId, cleanText);
    
    if (sentMessage && sentMessage.message_id) {
      lastMessages[chatId] = sentMessage.message_id;
    }
    return sentMessage;
  } catch (err) {
    log("ERROR", `sendPlainMessage failed: ${err.message}`);
    return null;
  }
};

const sendNewMessageWithCleanup = async (bot, chatId, content, options = {}) => {
  try {
    await removeReplyKeyboard(bot, chatId);
    let cleanText = content || '';
    cleanText = cleanText.replace(/\*/g, '').replace(/_/g, '').replace(/`/g, '').replace(/\[/g, '').replace(/\]/g, '').replace(/\(/g, '').replace(/\)/g, '').replace(/\|/g, '').trim();
    const sent = await bot.sendMessage(chatId, cleanText);
    return sent;
  } catch (err) {
    console.log(`❌ sendNewMessageWithCleanup error: ${err.message}`);
    return null;
  }
};

// ==========================================
// 🔥 BOT MESSAGE HANDLER
// ==========================================

bot.on("message", async (msg) => {
  const id = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text || '';
  
  if (!users[id]) {
    users[id] = { 
      id, 
      username: msg.from.username || msg.from.first_name || "-", 
      first_name: msg.from.first_name || "-",
      date: new Date().toISOString() 
    };
    saveJSON(USERS_FILE, users);
  }

  const tambahHandled = await menu.handleTambahDaerahStep(id, text, bot, sendPlainMessage);
  if (tambahHandled) return;

  if (text === '📱 STATUS WA') {
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    
    try {
        const bridgeStatus = await axios.get(`http://localhost:3004/wa-status`, {
            timeout: 3000
        });
        
        if (bridgeStatus.data) {
            const data = bridgeStatus.data;
            let textMsg = `📊 STATUS WHATSAPP BOT\n\n`;
            textMsg += `📱 Bridge: ✅ Online\n`;
            textMsg += `📁 Total Users: ${data.total_users || 0}\n`;
            textMsg += `📍 Total Regions: ${data.total_regions || 0}\n`;
            textMsg += `📁 WA Folder: ${data.wabot_folder_exists ? '✅ Ada' : '❌ Tidak ada'}\n`;
            
            try {
                const waResponse = await axios.get(`${WA_API_URL}/api/pairing-status`, {
                    timeout: 3000
                });
                const waStatus = waResponse.data;
                
                let phoneNumber = waStatus.phone || '-';
                if (phoneNumber.includes(':')) {
                    phoneNumber = phoneNumber.split(':')[0];
                }
                
                textMsg += `\n📱 WA Bot: ${waStatus.connected ? '✅ Online' : '❌ Offline'}\n`;
                textMsg += `📞 Nomor: ${phoneNumber}\n`;
                textMsg += `👥 Kontak: ${waStatus.contacts || 0}\n`;
                textMsg += `⏱️ Uptime: ${formatUptime(waStatus.uptime || 0)}`;
            } catch (e) {
                textMsg += `\n📱 WA Bot: ❌ Tidak terhubung (port 3005)`;
            }
            
            return bot.sendMessage(id, textMsg);
        }
        
    } catch (error) {
        console.log('❌ Status WA error:', error.message);
        return bot.sendMessage(id, 
            `❌ Gagal cek status WA Bot\n\n1️⃣ Cek bridge: pm2 status bridge\n2️⃣ Cek WA Bot: pm2 status wabot\n3️⃣ Cek log: pm2 logs`
        );
    }
  }

  if (text === '🔑 PAIRING') {
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    await waMenu.showPairingMenu(id, sendNewMessage, bot);
    return;
  }

  if (text === '🔄 RESET SESSION') {
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    
    bot.sendMessage(id, '⏳ Menghapus session WhatsApp...');
    try {
        const response = await axios.post(`${WA_API_URL}/reset-session`);
        if (response.data.status === 'success') {
            return bot.sendMessage(id, '✅ Session WhatsApp berhasil dihapus!\n\nSilahkan pairing ulang dengan:\n/pair 628xxxxxxxxxx');
        } else {
            return bot.sendMessage(id, '❌ Gagal menghapus session');
        }
    } catch (error) {
        return bot.sendMessage(id, '❌ Gagal menghapus session\n\nPastikan WA Bot berjalan di port 3005');
    }
  }

  if (text === '🔧 REPAIR WA') {
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    
    bot.sendMessage(id, '🔧 REPAIR WHATSAPP BOT\n\n⏳ Menghapus session lama untuk ganti nomor...');
    
    try {
        const { exec } = require('child_process');
        const fs = require('fs');
        
        const sessionDir = '/root/wabot/sessions';
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            console.log('✅ Session dihapus (siap ganti nomor)');
        }
        
        const credsFile = '/root/wabot/sessions/creds.json';
        if (fs.existsSync(credsFile)) {
            fs.unlinkSync(credsFile);
            console.log('✅ creds.json dihapus');
        }
        
        exec('pm2 restart wabot', (error, stdout, stderr) => {
            if (error) {
                console.log('❌ Restart error:', error.message);
                return bot.sendMessage(id, 
                    '❌ Gagal merestart WA Bot\n\nSession sudah dihapus!\nSilahkan restart manual:\npm2 restart wabot\n\nLalu pairing ulang dengan nomor baru:\n/pair 628xxxxxxxxxx'
                );
            }
            
            console.log('✅ WA Bot direstart');
            
            setTimeout(() => {
                bot.sendMessage(id, 
                    '✅ REPAIR SELESAI!\n\n📱 Session WhatsApp berhasil dihapus\n🔄 WA Bot berhasil direstart\n✅ Data user tetap aman\n\n🔑 PAIRING DENGAN NOMOR BARU:\n/pair 628xxxxxxxxxx\n\n📌 Data user (sewa & daerah) TIDAK dihapus!'
                );
            }, 3000);
        });
        
    } catch (error) {
        console.log('❌ Repair error:', error.message);
        bot.sendMessage(id, 
            `❌ Gagal repair\n\nError: ${error.message}\n\n📌 Coba manual:\nrm -rf /root/wabot/sessions\npm2 restart wabot`
        );
    }
  }

  if (text === '♻️ RESTART WA') {
    console.log('🔄🔴 RESTART WA DIKLIK!');
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    
    bot.sendMessage(id, '⏳ Merestart WA Bot...');
    
    try {
        const { exec } = require('child_process');
        
        exec('pm2 restart wabot', (error, stdout, stderr) => {
            console.log('📌 Exec: pm2 restart wabot');
            
            if (error) {
                console.log('❌ Error:', error.message);
                console.log('❌ stderr:', stderr);
                return bot.sendMessage(id, `❌ Gagal restart WA Bot\n\n${error.message}`);
            }
            
            console.log('✅ stdout:', stdout);
            
            setTimeout(() => {
                bot.sendMessage(id, '✅ WA Bot berhasil direstart!\n\nCek status dengan /statuswa');
            }, 2000);
        });
        
    } catch (error) {
        console.log('❌ Restart error:', error.message);
        bot.sendMessage(id, '❌ Gagal restart WA Bot');
    }
  }

  if (text === '📋 LOGS WA') {
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    
    try {
        const { exec } = require('child_process');
        exec('pm2 logs wabot --lines 15 --nostream', (error, stdout, stderr) => {
            if (error) {
                return bot.sendMessage(id, '❌ Gagal mengambil logs');
            }
            const logs = stdout || stderr;
            if (logs.length > 4000) {
                return bot.sendMessage(id, '📋 LOG WA BOT (Terpotong)\n\n' + logs.slice(-3500));
            } else {
                return bot.sendMessage(id, '📋 LOG WA BOT\n\n' + logs);
            }
        });
    } catch (error) {
        return bot.sendMessage(id, '❌ Gagal mengambil logs');
    }
  }

  if (text === '📢 BROADCAST WA') {
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    await waMenu.showBroadcastWAMenu(id, sendNewMessage, bot);
    return;
  }

  if (text === '🔙 WHATSAPP') {
    console.log(`🔙 User ${userId} kembali ke menu WhatsApp`);
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    await waMenu.showWhatsAppMenu(id, sendNewMessage, bot);
    return;
  }

  if (text === '🔙 BACK MENU' || text === '🔙 MENU') {
    console.log(`🔙 User ${userId} kembali ke menu utama`);
    await menu.deleteAllMessages(bot, id);
    await removeReplyKeyboard(bot, id);
    const isAuth = isAuthorized(userId);
    await menu.showMenu(id, isAuth, users, sendNewMessage, bot);
    return;
  }

  if (text === '1 Minggu - Rp1' || text === '1 Minggu - Rp50.000') {
    const fakeMsg = { chat: { id: id }, from: { id: userId }, text: '/sewa 1minggu' };
    await sewaBot.handleSewaCommand(fakeMsg, bot, sendPlainMessage, sendNewMessage);
    return;
  }

  if (text === '1 Bulan - Rp100.000') {
    const fakeMsg = { chat: { id: id }, from: { id: userId }, text: '/sewa 1bulan' };
    await sewaBot.handleSewaCommand(fakeMsg, bot, sendPlainMessage, sendNewMessage);
    return;
  }

  if (text === '1 Tahun - Rp500.000') {
    const fakeMsg = { chat: { id: id }, from: { id: userId }, text: '/sewa 1tahun' };
    await sewaBot.handleSewaCommand(fakeMsg, bot, sendPlainMessage, sendNewMessage);
    return;
  }

  if (text === '📊 CEK SEWA') {
    const fakeMsg = { chat: { id: id }, from: { id: userId }, text: '/ceksewa' };
    await sewaBot.handleSewaCommand(fakeMsg, bot, sendPlainMessage, sendNewMessage);
    return;
  }

  if (text === '📍 DAERAH SAYA') {
    const fakeMsg = { chat: { id: id }, from: { id: userId }, text: '/daerahsaya' };
    await sewaBot.handleSewaCommand(fakeMsg, bot, sendPlainMessage, sendNewMessage);
    return;
  }

  if (text === '👥 LIST USER') {
    console.log(`🔍 [LIST USER] Diklik oleh ${userId}`);
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    try {
        await adminMenu.listUser(id, bot);
    } catch (error) {
        console.log(`❌ Error list user:`, error.message);
        await bot.sendMessage(id, `❌ Error: ${error.message}`);
    }
    return;
  }

  if (text === '🔍 CEK STATUS') {
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    bot.sendMessage(id, 
        `🔍 CEK STATUS USER\n\n📌 Kirim perintah:\n/cekstatus [user_id]\n\n📌 Contoh:\n/cekstatus 123456789\n\n📌 Lihat daftar user: /listuser`
    );
    return;
  }

  if (text === '📢 BROADCAST') {
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    await adminMenu.showBroadcastMenu(id, sendPlainMessage, bot);
    return;
  }

  if (['📝 BROADCAST TEXT', '🏷️ BROADCAST TAG', '📌 BROADCAST PIN', 
       '📸 BROADCAST FOTO', '🏷️ FOTO + TAG', '📌 FOTO + PIN',
       '🎥 BROADCAST VIDEO', '🏷️ VIDEO + TAG', '📌 VIDEO + PIN',
       '🔙 ADMIN'].includes(text)) {
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    await adminMenu.handleBroadcastButtons(id, text, sendPlainMessage, bot);
    return;
  }

  if (text === '💰 CEK TRANSAKSI') {
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    const fakeMsg = { chat: { id: id }, from: { id: userId } };
    await bot.emit('text', { ...fakeMsg, text: '/ceksewaall' });
    return;
  }

  if (text === '➕ ADD SEWA') {
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    bot.sendMessage(id, '📌 Format: /addsewa [user_id] [durasi]\nContoh: /addsewa 123456789 30d\n\n📌 Lihat bantuan: /addsewahelp');
    return;
  }

  if (text === '❌ DELETE SEWA') {
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    bot.sendMessage(id, '📌 Format: /delsewa [user_id]\nContoh: /delsewa 123456789\n\n📌 Lihat daftar user: /listuser');
    return;
  }

  if (text === '⚙️ SETTING') {
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    bot.sendMessage(id, '⚙️ SETTING BOT\n\n📌 Commands:\n/sewa - Sewa bot\n/ceksewa - Cek sewa\n/savedata - Simpan data\n/lihatdata - Lihat data\n/hapusdata - Hapus data\n/start - Menu utama');
    return;
  }

  if (text === '📊 STATISTIK') {
    if (!isAuthorized(userId)) return bot.sendMessage(id, '❌ Khusus owner/admin!');
    
    const sewaFile = path.join(__dirname, 'sewa_aktif.json');
    let sewaData = loadJSON(sewaFile);
    const aktif = Object.keys(sewaData).filter(id => sewaData[id].active).length;
    
    bot.sendMessage(id, 
        `📊 STATISTIK BOT\n\n👥 Total User: ${Object.keys(users).length}\n🤖 Sewa Aktif: ${aktif}\n📅 Total Sewa: ${Object.keys(sewaData).length}`
    );
    return;
  }
});

// ==========================================
// 🔥 SEMUA COMMAND PAKE bot.onText DI LUAR
// ==========================================

// ===== START COMMAND =====
bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  const isAuth = isAuthorized(msg.from.id);
  const username = msg.from.username || msg.from.first_name || chatId;
  
  if (!users[chatId]) {
    users[chatId] = { 
      id: chatId, 
      username: msg.from.username || msg.from.first_name || "-", 
      first_name: msg.from.first_name || "-",
      date: new Date().toISOString() 
    };
    saveJSON(USERS_FILE, users);
  }
  
  await deletePreviousMessage(chatId);
  
  if (!hasSeenWelcome(chatId)) {
    return showWelcomeScreen(chatId, username, sendNewMessage, bot);
  }
  
  return menu.showMenu(chatId, isAuth, users, sendNewMessage, bot);
});

// ===== SEWA COMMANDS =====
bot.onText(/^\/(sewa|ceksewa|batalkan)/, async (msg) => {
  await sewaBot.handleSewaCommand(msg, bot, sendPlainMessage, sendNewMessage);
});

// ===== TAMBAH DAERAH COMMAND =====
bot.onText(/^\/tambah(.+)?/, async (msg, match) => {
  const chatId = msg.chat.id;
  
  if (!match[1] || match[1].trim() === '') {
    return menu.showTambahDaerahMenu(chatId, sendNewMessage, bot);
  }
  
  const text = `/tambah ${match[1].trim()}`;
  await handleTambahDaerah(chatId, text, bot, sendPlainMessage);
});

// ===== SAVE DATA COMMANDS =====
bot.onText(/^\/savedata (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const dataFile = path.join(__dirname, 'user_data.json');
  let userData = loadJSON(dataFile);
  
  const input = match[1];
  const parts = input.split('|');
  if (parts.length < 2) {
    return sendPlainMessage(chatId, 
      '❌ Format salah!\n\n📌 Format: /savedata [judul] | [isi]\n\nContoh:\n/savedata Catatan | Ini adalah catatan penting'
    );
  }
  
  const judul = parts[0].trim();
  const isi = parts.slice(1).join('|').trim();
  
  if (!judul || !isi) {
    return sendPlainMessage(chatId, '❌ Judul dan isi tidak boleh kosong!');
  }
  
  if (!userData[chatId]) userData[chatId] = [];
  userData[chatId].push({
    id: Date.now(),
    judul: judul,
    isi: isi,
    tanggal: new Date().toLocaleDateString('id-ID'),
    waktu: new Date().toLocaleTimeString('id-ID')
  });
  
  saveJSON(dataFile, userData);
  sendPlainMessage(chatId, `✅ Data ${judul} berhasil disimpan!`);
});

bot.onText(/^\/lihatdata$/, async (msg) => {
  const chatId = msg.chat.id;
  const dataFile = path.join(__dirname, 'user_data.json');
  let userData = loadJSON(dataFile);
  
  if (!userData[chatId] || userData[chatId].length === 0) {
    return sendPlainMessage(chatId, '📂 Belum ada data yang disimpan.\n\nGunakan /savedata untuk menyimpan data.');
  }
  
  let teks = '📂 DATA TERSIMPAN\n\n';
  userData[chatId].forEach((item, i) => {
    teks += `${i + 1}. ${item.judul}\n`;
    teks += `📝 ${item.isi}\n`;
    teks += `📅 ${item.tanggal} ${item.waktu}\n`;
    teks += `🆔 ${item.id}\n\n`;
  });
  
  teks += '\n📌 Hapus data: /hapusdata [id]';
  sendPlainMessage(chatId, teks);
});

bot.onText(/^\/hapusdata (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const id = parseInt(match[1]);
  const dataFile = path.join(__dirname, 'user_data.json');
  let userData = loadJSON(dataFile);
  
  if (!userData[chatId]) {
    return sendPlainMessage(chatId, '❌ Tidak ada data.');
  }
  
  const index = userData[chatId].findIndex(item => item.id === id);
  if (index === -1) {
    return sendPlainMessage(chatId, `❌ Data dengan ID ${id} tidak ditemukan.`);
  }
  
  const judul = userData[chatId][index].judul;
  userData[chatId].splice(index, 1);
  saveJSON(dataFile, userData);
  
  sendPlainMessage(chatId, `✅ Data ${judul} berhasil dihapus!`);
});

// ===== WHATSAPP COMMANDS (AUTHORIZED ONLY) =====
bot.onText(/^\/pairwa$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  try {
    const status = await bridgeTelegram.getWAStatus();
    if (status && status.connected) {
      return sendPlainMessage(chatId, `✅ WA Bot sudah terhubung!\n📞 ${status.phone}`);
    }
  } catch (e) {}
  
  sendPlainMessage(chatId, '📱 PAIRING WHATSAPP\n\nKirim nomor WhatsApp:\n/pair 628xxxxxxxxxx');
});

bot.onText(/^\/pair (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  const phoneNumber = match[1].replace(/[^0-9]/g, '');
  if (!phoneNumber.match(/^628\d{8,13}$/)) {
    return sendPlainMessage(chatId, '❌ Nomor tidak valid! Gunakan format 628xxxxxxxxxx');
  }
  
  sendPlainMessage(chatId, `⏳ Memproses pairing untuk ${phoneNumber}...`);
  
  try {
    const response = await axios.post('http://127.0.0.1:3005/pair', { phoneNumber: phoneNumber });
    if (response.data.status === 'success') {
      sendPlainMessage(chatId, `✅ Kode pairing dikirim ke WhatsApp\n\n📱 Nomor: ${phoneNumber}`);
    } else {
      sendPlainMessage(chatId, '❌ Gagal memulai pairing: ' + (response.data.message || 'Unknown error'));
    }
  } catch (error) {
    sendPlainMessage(chatId, '❌ Gagal memulai pairing\n\nPastikan WA Bot berjalan di port 3005.');
  }
});

// ==========================================
// 🔥 PAIR QR - TANPA TOMBOL DI LOADING
// ==========================================

const pairingStatus = {};

bot.onText(/^\/pairqr(?:\s+(\d+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const phoneNumber = match ? match[1] : null;

    if (!isAuthorized(userId)) {
        return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
    }

    if (!phoneNumber) {
        return sendPlainMessage(chatId, 
            `📱 Kirim: /pairqr 628xxxxxxxxxx\n📌 Contoh: /pairqr 6285811121679`
        );
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone.startsWith('628') || cleanPhone.length < 11) {
        return sendPlainMessage(chatId, '❌ Nomor tidak valid! Format: 628xxxxxxxxxx');
    }

    // CEK APAKAH SEDANG PROSES PAIRING
    if (pairingStatus[chatId] && pairingStatus[chatId].active) {
        return sendPlainMessage(chatId, 
            `⏳ *Masih dalam proses pairing!*\n📱 Nomor: ${pairingStatus[chatId].phone}\n⏰ Sisa waktu: ${Math.ceil((pairingStatus[chatId].expired - Date.now()) / 1000)} detik\n\n📌 Tunggu sampai selesai.`
        );
    }

    try {
        // Simpan status pairing
        pairingStatus[chatId] = {
            active: true,
            phone: cleanPhone,
            expired: Date.now() + 180000 // 3 menit
        };

        // 🔥 KIRIM PESAN LOADING TANPA TOMBOL
        const sentMsg = await bot.sendMessage(chatId, 
            `📱 *QR CODE SEDANG DIKIRIM...*\n\n📞 ${cleanPhone}\n⏳ Tunggu sebentar...`,
            {
                parse_mode: 'Markdown'
            }
        );

        global._loadingMsgId = sentMsg.message_id;

        // Panggil WA-Bot untuk pairing
        const response = await axios.post('http://127.0.0.1:3005/pair', {
            phoneNumber: cleanPhone
        }, { timeout: 30000 });

        if (response.data.success) {
            console.log('✅ Pairing berhasil, menunggu QR...');
            
            setTimeout(() => {
                if (pairingStatus[chatId]) {
                    delete pairingStatus[chatId];
                }
            }, 5000);

        } else {
            throw new Error(response.data.error || 'Gagal pairing');
        }

    } catch (error) {
        console.error('❌ [PAIRQR] Error:', error.message);
        
        delete pairingStatus[chatId];
        
        try {
            await bot.deleteMessage(chatId, global._loadingMsgId);
            global._loadingMsgId = null;
        } catch (e) {}
        
        let errorMsg = `❌ Gagal! `;
        if (error.code === 'ECONNREFUSED') {
            errorMsg += `WA Bot tidak berjalan. Restart: pm2 restart wabot`;
        } else {
            errorMsg += error.message || 'Unknown error';
        }
        
        await sendPlainMessage(chatId, errorMsg);
    }
});

bot.onText(/^\/cekpair$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  try {
    const status = await bridgeTelegram.getWAStatus();
    if (status && status.connected) {
      sendPlainMessage(chatId, 
        `✅ WA Bot Terhubung!\n\n📞 Nomor: ${status.phone}\n👥 Kontak: ${status.contacts}\n⏱️ Uptime: ${formatUptime(status.uptime)}`
      );
    } else {
      sendPlainMessage(chatId, '❌ WA Bot belum terhubung.\n\nGunakan /pairwa untuk memulai pairing.');
    }
  } catch (error) {
    sendPlainMessage(chatId, '❌ Gagal cek status WA Bot');
  }
});

bot.onText(/^\/statuswa$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  const status = await bridgeTelegram.getWAStatus();
  if (!status) return sendPlainMessage(chatId, '❌ WA Bot offline\nPastikan WA bot berjalan di port 3005');
  
  let text = `📊 STATUS WHATSAPP BOT\n\n`;
  text += `📱 Status: ${status.connected ? '✅ Online' : '❌ Offline'}\n`;
  text += `📞 Nomor: ${status.phone || '-'}\n`;
  text += `👥 Kontak: ${status.contacts || 0}\n`;
  text += `⏱️ Uptime: ${formatUptime(status.uptime)}`;
  sendPlainMessage(chatId, text);
});

bot.onText(/^\/repair$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  sendPlainMessage(chatId, '🔧 REPAIR WHATSAPP BOT\n\n⏳ Menghapus session lama dan merestart WA Bot...');
  
  try {
    const response = await axios.post(`${WA_API_URL}/reset-session`);
    if (response.data.status === 'success') {
      const { exec } = require('child_process');
      exec('pm2 restart wabot', (error) => {
        if (error) {
          sendPlainMessage(chatId, '❌ Gagal merestart WA Bot\n\nSilahkan restart manual: pm2 restart wabot');
          return;
        }
        setTimeout(() => {
          sendPlainMessage(chatId, 
            '✅ REPAIR SELESAI!\n\n📱 Session WhatsApp berhasil dihapus\n🔄 WA Bot berhasil direstart\n\n🔑 Pairing ulang: /pair 628xxxxxxxxxx'
          );
        }, 3000);
      });
    } else {
      sendPlainMessage(chatId, '❌ Gagal menghapus session');
    }
  } catch (error) {
    sendPlainMessage(chatId, '❌ Gagal repair\n\nPastikan WA Bot berjalan di port 3005');
  }
});

bot.onText(/^\/resetsession$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  sendPlainMessage(chatId, '⏳ Menghapus session WhatsApp...');
  
  try {
    const response = await axios.post(`${WA_API_URL}/reset-session`);
    if (response.data.status === 'success') {
      sendPlainMessage(chatId, '✅ Session WhatsApp berhasil dihapus!\n\nSilahkan pairing ulang dengan:\n/pair 628xxxxxxxxxx');
    } else {
      sendPlainMessage(chatId, '❌ Gagal menghapus session');
    }
  } catch (error) {
    sendPlainMessage(chatId, '❌ Gagal menghapus session\n\nPastikan WA Bot berjalan di port 3005');
  }
});

bot.onText(/^\/restartwa$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  sendPlainMessage(chatId, '⏳ Merestart WA Bot...');
  
  try {
    const { exec } = require('child_process');
    exec('pm2 restart wabot', (error) => {
      if (error) {
        sendPlainMessage(chatId, '❌ Gagal restart WA Bot');
        return;
      }
      sendPlainMessage(chatId, '✅ WA Bot berhasil direstart!\n\nCek status dengan /statuswa');
    });
  } catch (error) {
    sendPlainMessage(chatId, '❌ Gagal restart WA Bot');
  }
});

bot.onText(/^\/logswa$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  try {
    const { exec } = require('child_process');
    exec('pm2 logs wabot --lines 15 --nostream', (error, stdout, stderr) => {
      if (error) {
        sendPlainMessage(chatId, '❌ Gagal mengambil logs');
        return;
      }
      const logs = stdout || stderr;
      if (logs.length > 4000) {
        sendPlainMessage(chatId, '📋 LOG WA BOT (Terpotong)\n\n' + logs.slice(-3500));
      } else {
        sendPlainMessage(chatId, '📋 LOG WA BOT\n\n' + logs);
      }
    });
  } catch (error) {
    sendPlainMessage(chatId, '❌ Gagal mengambil logs');
  }
});

bot.onText(/^\/broadcastwa (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  const message = match[1];
  sendPlainMessage(chatId, `⏳ Mengirim broadcast ke semua kontak WA...`);
  
  try {
    const response = await axios.post(`${WA_API_URL}/broadcast-wa`, {
      message: message,
      from: 'Telegram Bot'
    });
    sendPlainMessage(chatId, 
      `✅ Broadcast selesai\n\n📤 Terkirim: ${response.data.sent}\n❌ Gagal: ${response.data.failed}\n👥 Total: ${response.data.total}`
    );
  } catch (error) {
    sendPlainMessage(chatId, '❌ Gagal broadcast\n\nPastikan WA bot berjalan');
  }
});

bot.onText(/^\/sendwa (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  const args = match[1].split(' ');
  const phoneNumber = args[0];
  const message = args.slice(1).join(' ');
  
  if (!phoneNumber || !message) return sendPlainMessage(chatId, '❌ Format: /sendwa 628xxx pesan');
  if (!phoneNumber.match(/^628\d{8,13}$/)) return sendPlainMessage(chatId, '❌ Nomor tidak valid!');
  
  const result = await bridgeTelegram.sendToWhatsApp(phoneNumber, message);
  if (result) {
    sendPlainMessage(chatId, `✅ Pesan terkirim ke ${phoneNumber}`);
  } else {
    sendPlainMessage(chatId, '❌ Gagal kirim pesan');
  }
});

bot.onText(/^\/testwa$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  try {
    const status = await bridgeTelegram.getWAStatus();
    if (status && status.connected) {
      sendPlainMessage(chatId, `✅ WA Bot terhubung!\n📞 ${status.phone}\n👥 ${status.contacts} kontak`);
    } else {
      sendPlainMessage(chatId, '❌ WA Bot tidak terhubung!\nGunakan /pairwa');
    }
  } catch (error) {
    sendPlainMessage(chatId, '❌ Gagal koneksi ke WA Bot');
  }
});

// ===== TEST BRIDGE =====
bot.onText(/^\/testbridge$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  try {
    const response = await axios.get('http://localhost:3004/test-bridge');
    if (response.data.status === 'ok') {
      sendPlainMessage(chatId, '✅ Bridge berjalan! Cek pesan notifikasi.');
    } else {
      sendPlainMessage(chatId, '❌ Bridge error!');
    }
  } catch (error) {
    sendPlainMessage(chatId, '❌ Bridge tidak merespon!');
  }
});

// ==========================================
// 🔥 PAIRING & REPAIR WA BOT - TELEGRAM (FULL FIXED)
// ==========================================

// 🔥 PAIRING - KONEKSI PERTAMA KALI
bot.onText(/^\/pair(?:\s+(\d+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const phoneNumber = match ? match[1] : null;

    if (!isAuthorized(userId)) {
        return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
    }

    try {
        const status = await axios.get('http://127.0.0.1:3005/api/pairing-status', { timeout: 2000 });
        if (status.data && status.data.connected) {
            return sendPlainMessage(chatId, 
                `❌ Bot sudah terhubung!\n\n📱 Nomor: ${status.data.phone}\n\n📌 Ganti nomor? Gunakan:\n/repair 628xxxxxxxxxx`
            );
        }
    } catch (e) {}

    if (!phoneNumber) {
        return sendPlainMessage(chatId, 
            `📱 PAIRING WA BOT\n\n📌 Untuk koneksi pertama kali:\n/pair 628xxxxxxxxxx\n\n📌 Contoh:\n/pair 6283830803474\n\n📌 Ganti nomor? Gunakan:\n/repair 628xxxxxxxxxx`
        );
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone.startsWith('628') || cleanPhone.length < 11) {
        return sendPlainMessage(chatId, 
            `❌ Nomor tidak valid!\n\nFormat: 628xxxxxxxxxx\nContoh: /pair 6283830803474`
        );
    }

    await sendPlainMessage(chatId, 
        `⏳ Memulai pairing...\n\n📱 Nomor: ${cleanPhone}\n⏱️ Mohon tunggu...`
    );

    try {
        const response = await axios.post('http://127.0.0.1:3005/pair', {
            phoneNumber: cleanPhone
        }, { timeout: 30000 });

        if (response.data.success) {
            const code = response.data.code;
            
            await sendPlainMessage(chatId,
                `✅ PAIRING BERHASIL DIMULAI!\n\n📱 Nomor: ${cleanPhone}\n🔑 Kode: ${code}\n\n📌 Langkah selanjutnya:\n1. Buka WhatsApp di HP ${cleanPhone}\n2. Buka Perangkat tertaut > Tautkan perangkat\n3. Masukkan kode: ${code}\n4. Tunggu 5-10 detik sampai terhubung ✅\n\n📌 Cek status: /pairstatus`
            );

            await bot.sendMessage(OWNER_ID,
                `🔔 PAIRING REQUEST\n\n📱 Nomor: ${cleanPhone}\n🔑 Kode: ${code}\n👤 Oleh: @${msg.from.username || msg.from.first_name}`
            );

        } else {
            throw new Error(response.data.error || 'Gagal pairing');
        }

    } catch (error) {
        console.error('❌ [PAIR] Error:', error.message);
        
        let errorMsg = `❌ Gagal pairing!\n\n`;
        
        if (error.code === 'ECONNREFUSED') {
            errorMsg += `⚠️ WA Bot tidak berjalan!\n\nRestart: pm2 restart wabot`;
        } else if (error.response?.data?.error) {
            errorMsg += error.response.data.error;
        } else {
            errorMsg += error.message || 'Unknown error';
        }
        
        await sendPlainMessage(chatId, errorMsg);
    }
});

// 🔥 REPAIR - GANTI NOMOR (HAPUS SESSION LAMA)
bot.onText(/^\/repair(?:\s+(\d+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const phoneNumber = match ? match[1] : null;

    if (!isAuthorized(userId)) {
        return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
    }

    if (!phoneNumber) {
        return sendPlainMessage(chatId, 
            `🔧 REPAIR WA BOT - GANTI NOMOR\n\n📌 Fungsi:\nMenghapus session lama dan pairing dengan nomor baru.\n\n📌 Format:\n/repair 628xxxxxxxxxx\n\n📌 Contoh:\n/repair 6283830803474\n\n⚠️ Perhatian:\nSession lama akan DIHAPUS!\nWA Bot akan putus koneksi dan pairing ulang.`
        );
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone.startsWith('628') || cleanPhone.length < 11) {
        return sendPlainMessage(chatId, 
            `❌ Nomor tidak valid!\n\nFormat: 628xxxxxxxxxx\nContoh: /repair 6283830803474`
        );
    }

    await sendPlainMessage(chatId, 
        `⚠️ KONFIRMASI REPAIR\n\n📱 Nomor baru: ${cleanPhone}\n\n⚠️ Session lama akan DIHAPUS!\nWA Bot akan putus koneksi.\n\n📌 Ketik ulang perintah untuk konfirmasi:\n/repair ${cleanPhone}`
    );

    await new Promise(r => setTimeout(r, 3000));

    await sendPlainMessage(chatId, 
        `⏳ Memproses repair...\n\n📱 Menghapus session lama...\n📱 Pairing dengan nomor baru: ${cleanPhone}`
    );

    try {
        const response = await axios.post('http://127.0.0.1:3005/repair', {
            phoneNumber: cleanPhone
        }, { timeout: 30000 });

        if (response.data.success) {
            const code = response.data.code;
            
            await sendPlainMessage(chatId,
                `✅ REPAIR BERHASIL!\n\n📱 Nomor baru: ${cleanPhone}\n🔑 Kode: ${code}\n\n📌 Langkah selanjutnya:\n1. Buka WhatsApp di HP ${cleanPhone}\n2. Buka Perangkat tertaut > Tautkan perangkat\n3. Masukkan kode: ${code}\n4. Tunggu 5-10 detik sampai terhubung ✅\n\n📌 Cek status: /pairstatus`
            );

            await bot.sendMessage(OWNER_ID,
                `🔧 REPAIR SELESAI\n\n📱 Nomor baru: ${cleanPhone}\n🔑 Kode: ${code}\n👤 Oleh: @${msg.from.username || msg.from.first_name}`
            );

        } else {
            throw new Error(response.data.error || 'Gagal repair');
        }

    } catch (error) {
        console.error('❌ [REPAIR] Error:', error.message);
        
        let errorMsg = `❌ Gagal repair!\n\n`;
        
        if (error.code === 'ECONNREFUSED') {
            errorMsg += `⚠️ WA Bot tidak berjalan!\n\nRestart: pm2 restart wabot`;
        } else if (error.response?.data?.error) {
            errorMsg += error.response.data.error;
        } else {
            errorMsg += error.message || 'Unknown error';
        }
        
        await sendPlainMessage(chatId, errorMsg);
    }
});

// 🔥 CEK STATUS
bot.onText(/^\/pairstatus$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isAuthorized(userId)) {
        return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
    }
    
    try {
        const response = await axios.get('http://127.0.0.1:3005/api/pairing-status', { 
            timeout: 3000 
        });
        const data = response.data;
        
        let text = `📱 STATUS WA BOT\n\n`;
        text += `🔗 Status: ${data.connected ? '✅ Terhubung' : '❌ Belum terhubung'}\n`;
        text += `📞 Nomor: ${data.phone || '-'}\n\n`;
        
        if (!data.connected) {
            text += `📌 Pairing: /pair 628xxxxxxxxxx`;
        } else {
            text += `📌 Ganti nomor: /repair 628xxxxxxxxxx`;
        }
        
        await sendPlainMessage(chatId, text);
        
    } catch (error) {
        await sendPlainMessage(chatId, 
            `❌ Gagal cek status\n\nRestart WA Bot:\npm2 restart wabot`
        );
    }
});

// ==========================================
// 🔥 OWNER/ADMIN COMMANDS
// ==========================================

bot.onText(/^\/listuser$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  const userList = Object.keys(users);
  if (userList.length === 0) return sendPlainMessage(chatId, '❌ Belum ada user');
  
  let teks = `👥 LIST USER (${userList.length})\n\n`;
  userList.forEach((id, i) => {
    const user = users[id];
    teks += `${i + 1}. ID: ${id}\n   Username: ${user.username || '-'}\n   Bergabung: ${user.date || '-'}\n\n`;
  });
  
  sendPlainMessage(chatId, teks);
});

// ==========================================
// 🔥 UNPIN / LEPAS SEMAT
// ==========================================

bot.onText(/\/unpin(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
    
    if (match[1]) {
        const targetId = match[1].trim();
        if (!targetId.match(/^\d+$/)) {
            return sendPlainMessage(chatId, '❌ Format: /unpin [user_id]');
        }
        try {
            await bot.unpinChatMessage(parseInt(targetId));
            return sendPlainMessage(chatId, `✅ Sematan di chat ${targetId} berhasil dilepas!`);
        } catch (e) {
            return sendPlainMessage(chatId, `❌ Gagal lepas semat: ${e.message}`);
        }
    }
    
    try {
        await bot.unpinChatMessage(chatId);
        return sendPlainMessage(chatId, '✅ Sematan berhasil dilepas!');
    } catch (e) {
        return sendPlainMessage(chatId, `❌ Gagal lepas semat: ${e.message}`);
    }
});

bot.onText(/\/unpinall/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
    
    const allUsers = Object.keys(users);
    if (allUsers.length === 0) return sendPlainMessage(chatId, "❌ Tidak ada user");
    
    let sukses = 0, gagal = 0;
    await sendPlainMessage(chatId, `🚀 Melepas sematan di ${allUsers.length} user...`);
    
    for (const id of allUsers) {
        try {
            await bot.unpinChatMessage(parseInt(id));
            sukses++;
            await new Promise(r => setTimeout(r, 50));
        } catch (e) { gagal++; }
    }
    
    await sendPlainMessage(chatId, 
        `✅ Unpin All selesai\n\n✔️ Sukses: ${sukses}\n❌ Gagal: ${gagal}\n👥 Total: ${allUsers.length}`
    );
});

// ===== ADMIN MANAGEMENT (OWNER ONLY) =====
bot.onText(/^\/addadmin (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) return sendPlainMessage(chatId, '❌ Khusus Owner!');
    
    const targetId = match[1].trim();
    if (!targetId.match(/^\d+$/)) {
        return sendPlainMessage(chatId, '❌ Format: /addadmin [user_id]');
    }
    
    let admins = loadAdmins();
    if (admins.includes(targetId)) {
        return sendPlainMessage(chatId, `⚠️ User ${targetId} sudah admin!`);
    }
    
    admins.push(targetId);
    saveAdmins(admins);
    
    try {
        await bot.sendMessage(targetId, '🎉 Selamat! Anda sekarang ADMIN bot!');
    } catch (e) {}
    
    sendPlainMessage(chatId, `✅ Admin ${targetId} berhasil ditambahkan!`);
});

bot.onText(/^\/addadmin$/, async (msg) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) return sendPlainMessage(chatId, '❌ Khusus Owner!');
    
    sendPlainMessage(chatId, 
        `📖 TAMBAH ADMIN\n\n📌 Format:\n/addadmin [user_id]\n\n📌 Contoh:\n/addadmin 123456789\n\n📌 Lihat daftar admin: /listadmin`
    );
});

bot.onText(/^\/deladmin (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) return sendPlainMessage(chatId, '❌ Khusus Owner!');
    
    const targetId = match[1].trim();
    let admins = loadAdmins();
    
    if (!admins.includes(targetId)) {
        return sendPlainMessage(chatId, `❌ User ${targetId} bukan admin!`);
    }
    
    admins = admins.filter(id => id !== targetId);
    saveAdmins(admins);
    
    sendPlainMessage(chatId, `✅ Admin ${targetId} berhasil dihapus!`);
});

bot.onText(/^\/deladmin$/, async (msg) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) return sendPlainMessage(chatId, '❌ Khusus Owner!');
    
    sendPlainMessage(chatId, 
        `📖 HAPUS ADMIN\n\n📌 Format:\n/deladmin [user_id]\n\n📌 Contoh:\n/deladmin 123456789\n\n📌 Lihat daftar admin: /listadmin`
    );
});

bot.onText(/^\/listadmin$/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg.from.id)) {
        return sendPlainMessage(chatId, '❌ Tidak punya akses!');
    }
    
    const admins = loadAdmins();
    if (admins.length === 0) {
        return sendPlainMessage(chatId, '📋 Belum ada admin.');
    }
    
    let teks = `👑 DAFTAR ADMIN (${admins.length})\n\n`;
    admins.forEach((id, i) => {
        const user = users[id];
        const username = user?.username || user?.first_name || '-';
        teks += `${i+1}. ID: ${id}\n   Username: ${username}\n\n`;
    });
    
    teks += `📌 Total Admin: ${admins.length}\n`;
    teks += `👑 Owner: ${OWNER_ID}`;
    
    sendPlainMessage(chatId, teks);
});

bot.onText(/^\/checkadmin (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg.from.id)) {
        return sendPlainMessage(chatId, '❌ Tidak punya akses!');
    }
    
    const targetId = match[1].trim();
    const admins = loadAdmins();
    const isAdmin = admins.includes(targetId);
    const isOwnerUser = targetId === OWNER_ID.toString();
    
    let statusText = '';
    if (isOwnerUser) {
        statusText = '👑 OWNER UTAMA';
    } else if (isAdmin) {
        statusText = '✅ ADMIN';
    } else {
        statusText = '❌ BUKAN ADMIN';
    }
    
    sendPlainMessage(chatId, 
        `🔍 STATUS ADMIN\n\n👤 User ID: ${targetId}\n📌 Status: ${statusText}`
    );
});

bot.onText(/^\/checkadmin$/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg.from.id)) {
        return sendPlainMessage(chatId, '❌ Tidak punya akses!');
    }
    
    sendPlainMessage(chatId, 
        `📖 CEK STATUS ADMIN\n\n📌 Format:\n/checkadmin [user_id]\n\n📌 Contoh:\n/checkadmin 123456789\n\n📌 Lihat daftar admin: /listadmin`
    );
});

// ===== CEK STATUS USER SPESIFIK =====
bot.onText(/^\/cekstatus (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  const userId = match[1].trim();
  await adminMenu.cekStatusUser(chatId, userId, sendPlainMessage);
});

// ===== DELETE SEWA =====
bot.onText(/^\/delsewa (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  const userId = match[1].trim();
  await adminMenu.deleteSewa(chatId, userId, sendPlainMessage, bot);
});

bot.onText(/^\/delsewa$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  sendPlainMessage(chatId, 
    `❌ Format salah!\n\nGunakan:\n/delsewa [user_id]\n\n📌 Contoh:\n/delsewa 123456789\n\n📌 Lihat daftar user: /listuser`
  );
});

bot.onText(/^\/ceksewaall$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  const sewaFile = path.join(__dirname, 'sewa_aktif.json');
  let sewaData = loadJSON(sewaFile);
  
  const aktif = Object.keys(sewaData).filter(id => sewaData[id].active);
  if (aktif.length === 0) return sendPlainMessage(chatId, '📊 Tidak ada sewa aktif');
  
  let teks = `📊 SEWA AKTIF (${aktif.length})\n\n`;
  aktif.forEach((id) => {
    const s = sewaData[id];
    const sisa = Math.ceil((s.expired - Date.now()) / (1000 * 60 * 60 * 24));
    teks += `👤 ${id}\n📦 ${s.duration}\n⏳ Sisa ${sisa} hari\n\n`;
  });
  
  sendPlainMessage(chatId, teks);
});

bot.onText(/\/broadcast(?: (.+))?/s, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
  
  await deletePreviousMessage(chatId);
  if (!match[1]) return sendPlainMessage(chatId, "📌 Format: /broadcast isi pesan");
  
  const text = match[1];
  const allUsers = Object.keys(users);
  if (allUsers.length === 0) return sendPlainMessage(chatId, "❌ Tidak ada user");
  
  let sukses = 0, gagal = 0;
  await sendPlainMessage(chatId, `🚀 Mengirim broadcast ke ${allUsers.length} user...`);
  
  for (const id of allUsers) {
    try {
      await bot.sendMessage(parseInt(id), text);
      sukses++;
      await new Promise(r => setTimeout(r, 50));
    } catch (e) { gagal++; }
  }
  
  await sendPlainMessage(chatId, `✅ Broadcast selesai\n\n✔️ Sukses: ${sukses}\n❌ Gagal: ${gagal}`);
});

// ==========================================
// 🔥 PHOTO BROADCAST HANDLERS
// ==========================================

bot.on("photo", async (msg) => {
    if (!isAuthorized(msg.from.id)) return;
    
    const caption = msg.caption || "";
    
    if (caption.startsWith("/broadcastfoto")) {
        await deletePreviousMessage(msg.chat.id);
        const allUsers = Object.keys(users);
        if (allUsers.length === 0) return sendPlainMessage(msg.chat.id, "❌ Tidak ada user");
        
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        const captionText = caption.replace("/broadcastfoto", "").trim();
        
        let sukses = 0, gagal = 0;
        await sendPlainMessage(msg.chat.id, `🚀 Mengirim broadcast foto ke ${allUsers.length} user...`);
        
        for (const id of allUsers) {
            try {
                await bot.sendPhoto(parseInt(id), photoId, { caption: captionText });
                sukses++;
                await new Promise(r => setTimeout(r, 100));
            } catch (e) { gagal++; }
        }
        
        await sendPlainMessage(msg.chat.id, 
            `✅ Broadcast Foto selesai\n\n✔️ Sukses: ${sukses}\n❌ Gagal: ${gagal}\n👥 Total: ${allUsers.length}`
        );
        return;
    }

    if (caption.startsWith("/broadcastfototag")) {
        await deletePreviousMessage(msg.chat.id);
        const allUsers = Object.keys(users);
        if (allUsers.length === 0) return sendPlainMessage(msg.chat.id, "❌ Tidak ada user");
        
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        const captionText = caption.replace("/broadcastfototag", "").trim() || "📸 Foto dari Admin";
        
        let sukses = 0, gagal = 0;
        await sendPlainMessage(msg.chat.id, `🚀 Mengirim broadcast foto tag ke ${allUsers.length} user...`);
        
        for (const id of allUsers) {
            try {
                const user = users[id];
                let mention = '';
                if (user && user.username) {
                    mention = `@${user.username}`;
                } else {
                    mention = `[${id}](tg://user?id=${id})`;
                }
                const fullCaption = `${captionText}\n\n📌 ${mention}`;
                await bot.sendPhoto(parseInt(id), photoId, { caption: fullCaption });
                sukses++;
                await new Promise(r => setTimeout(r, 100));
            } catch (e) { gagal++; }
        }
        
        await sendPlainMessage(msg.chat.id, 
            `✅ Broadcast Foto Tag selesai\n\n✔️ Sukses: ${sukses}\n❌ Gagal: ${gagal}\n👥 Total: ${allUsers.length}`
        );
        return;
    }
    
    if (caption.startsWith("/broadcastfotopin")) {
        await deletePreviousMessage(msg.chat.id);
        const allUsers = Object.keys(users);
        if (allUsers.length === 0) return sendPlainMessage(msg.chat.id, "❌ Tidak ada user");
        
        const photoId = msg.photo[msg.photo.length - 1].file_id;
        const captionText = caption.replace("/broadcastfotopin", "").trim() || "📸 Foto dari Admin";
        const fullCaption = `${captionText}`;
        
        let sukses = 0, gagal = 0, pinned = 0;
        await sendPlainMessage(msg.chat.id, `🚀 Mengirim broadcast foto pin ke ${allUsers.length} user...`);
        
        for (const id of allUsers) {
            try {
                const sent = await bot.sendPhoto(parseInt(id), photoId, { caption: fullCaption });
                sukses++;
                try {
                    await bot.pinChatMessage(parseInt(id), sent.message_id, { disable_notification: false });
                    pinned++;
                } catch (pinError) {}
                await new Promise(r => setTimeout(r, 100));
            } catch (e) { gagal++; }
        }
        
        await sendPlainMessage(msg.chat.id, 
            `✅ Broadcast Foto Pin selesai\n\n✔️ Sukses: ${sukses}\n📌 Disematkan: ${pinned}\n❌ Gagal: ${gagal}\n👥 Total: ${allUsers.length}`
        );
        return;
    }
});

// ==========================================
// 🔥 VIDEO BROADCAST HANDLERS
// ==========================================

bot.on("video", async (msg) => {
    if (!isAuthorized(msg.from.id)) return;
    
    const caption = msg.caption || "";
    
    if (caption.startsWith("/broadcastvideo")) {
        await deletePreviousMessage(msg.chat.id);
        const allUsers = Object.keys(users);
        if (allUsers.length === 0) return sendPlainMessage(msg.chat.id, "❌ Tidak ada user");
        
        const videoId = msg.video.file_id;
        const captionText = caption.replace("/broadcastvideo", "").trim() || "🎥 Video dari Admin";
        
        let sukses = 0, gagal = 0;
        await sendPlainMessage(msg.chat.id, `🚀 Mengirim broadcast video ke ${allUsers.length} user...`);
        
        for (const id of allUsers) {
            try {
                await bot.sendVideo(parseInt(id), videoId, { caption: captionText });
                sukses++;
                await new Promise(r => setTimeout(r, 150));
            } catch (e) { gagal++; }
        }
        
        await sendPlainMessage(msg.chat.id, 
            `✅ Broadcast Video selesai\n\n✔️ Sukses: ${sukses}\n❌ Gagal: ${gagal}\n👥 Total: ${allUsers.length}`
        );
        return;
    }
    
    if (caption.startsWith("/broadcastvideotag")) {
        await deletePreviousMessage(msg.chat.id);
        const allUsers = Object.keys(users);
        if (allUsers.length === 0) return sendPlainMessage(msg.chat.id, "❌ Tidak ada user");
        
        const videoId = msg.video.file_id;
        const captionText = caption.replace("/broadcastvideotag", "").trim() || "🎥 Video dari Admin";
        
        let sukses = 0, gagal = 0;
        await sendPlainMessage(msg.chat.id, `🚀 Mengirim broadcast video tag ke ${allUsers.length} user...`);
        
        for (const id of allUsers) {
            try {
                const user = users[id];
                let mention = '';
                if (user && user.username) {
                    mention = `@${user.username}`;
                } else {
                    mention = `[${id}](tg://user?id=${id})`;
                }
                const fullCaption = `${captionText}\n\n📌 ${mention}`;
                await bot.sendVideo(parseInt(id), videoId, { caption: fullCaption });
                sukses++;
                await new Promise(r => setTimeout(r, 150));
            } catch (e) { gagal++; }
        }
        
        await sendPlainMessage(msg.chat.id, 
            `✅ Broadcast Video Tag selesai\n\n✔️ Sukses: ${sukses}\n❌ Gagal: ${gagal}\n👥 Total: ${allUsers.length}`
        );
        return;
    }
    
    if (caption.startsWith("/broadcastvideopin")) {
        await deletePreviousMessage(msg.chat.id);
        const allUsers = Object.keys(users);
        if (allUsers.length === 0) return sendPlainMessage(msg.chat.id, "❌ Tidak ada user");
        
        const videoId = msg.video.file_id;
        const captionText = caption.replace("/broadcastvideopin", "").trim() || "🎥 Video dari Admin";
        const fullCaption = `${captionText}`;
        
        let sukses = 0, gagal = 0, pinned = 0;
        await sendPlainMessage(msg.chat.id, `🚀 Mengirim broadcast video pin ke ${allUsers.length} user...`);
        
        for (const id of allUsers) {
            try {
                const sent = await bot.sendVideo(parseInt(id), videoId, { caption: fullCaption });
                sukses++;
                try {
                    await bot.pinChatMessage(parseInt(id), sent.message_id, { disable_notification: false });
                    pinned++;
                } catch (pinError) {}
                await new Promise(r => setTimeout(r, 150));
            } catch (e) { gagal++; }
        }
        
        await sendPlainMessage(msg.chat.id, 
            `✅ Broadcast Video Pin selesai\n\n✔️ Sukses: ${sukses}\n📌 Disematkan: ${pinned}\n❌ Gagal: ${gagal}\n👥 Total: ${allUsers.length}`
        );
        return;
    }
});

// ==========================================
// 🔥 BROADCAST WITH TAG @ALL (PER USER)
// ==========================================

bot.onText(/\/broadcasttag(?: (.+))?/s, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
    
    await deletePreviousMessage(chatId);
    if (!match[1]) return sendPlainMessage(chatId, 
        `📌 BROADCAST WITH TAG\n\nFormat: /broadcasttag [pesan]\n\n📌 Contoh:\n/broadcasttag Pengumuman penting untuk semua member!`
    );
    
    const text = match[1];
    const allUsers = Object.keys(users);
    if (allUsers.length === 0) return sendPlainMessage(chatId, "❌ Tidak ada user");
    
    let sukses = 0, gagal = 0;
    await sendPlainMessage(chatId, `🚀 Mengirim broadcast tag ke ${allUsers.length} user...`);
    
    for (const id of allUsers) {
        try {
            const user = users[id];
            let mention = '';
            if (user && user.username) {
                mention = `@${user.username}`;
            } else {
                mention = `[${id}](tg://user?id=${id})`;
            }
            const fullMessage = `${text}\n\n📌 ${mention}`;
            await bot.sendMessage(parseInt(id), fullMessage);
            sukses++;
            await new Promise(r => setTimeout(r, 100));
        } catch (e) { gagal++; }
    }
    
    await sendPlainMessage(chatId, 
        `✅ Broadcast Tag selesai\n\n✔️ Sukses: ${sukses}\n❌ Gagal: ${gagal}\n👥 Total: ${allUsers.length}`
    );
});

// ==========================================
// 🔥 BROADCAST WITH PIN
// ==========================================

bot.onText(/\/broadcastpin(?: (.+))?/s, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');
    
    await deletePreviousMessage(chatId);
    if (!match[1]) return sendPlainMessage(chatId, 
        `📌 BROADCAST WITH PIN\n\nFormat: /broadcastpin [pesan]\n\n📌 Contoh:\n/broadcastpin Pengumuman penting!\n\n📌 Untuk pin/semat otomatis, chat pesan di semat manual.`
    );
    
    const text = match[1];
    const allUsers = Object.keys(users);
    if (allUsers.length === 0) return sendPlainMessage(chatId, "❌ Tidak ada user");
    
    const fullMessage = `${text}`;
    let sukses = 0, gagal = 0;
    await sendPlainMessage(chatId, `🚀 Mengirim broadcast pin ke ${allUsers.length} user...`);
    
    for (const id of allUsers) {
        try {
            await bot.sendMessage(parseInt(id), fullMessage);
            sukses++;
            await new Promise(r => setTimeout(r, 150));
        } catch (e) { gagal++; }
    }
    
    await sendPlainMessage(chatId, 
        `✅ Broadcast selesai\n\n✔️ Sukses: ${sukses}\n❌ Gagal: ${gagal}\n👥 Total: ${allUsers.length}\n\n📌 Untuk menyematkan (pin), silakan pin manual di chat masing-masing.`
    );
});

// ==========================================
// 🔥 ADD SEWA MANUAL
// ==========================================

bot.onText(/^\/addsewa (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return sendPlainMessage(chatId, '❌ Khusus owner/admin!');

  const args = match[1].trim().split(' ');
  if (args.length < 2) {
    return sendPlainMessage(chatId, 
      '❌ Format salah!\n\n📌 Format: /addsewa [user_id] [durasi]\n\n📝 Durasi:\n├ 7h = 7 jam\n├ 7d = 7 hari\n├ 30d = 30 hari (1 bulan)\n├ 90d = 90 hari (3 bulan)\n└ 365d = 365 hari (1 tahun)\n\n📌 Contoh:\n/addsewa 67626282626 7d\n/addsewa 67626282626 30d'
    );
  }

  const userId = args[0];
  const duration = args[1].toLowerCase();

  let days = 0;
  let label = '';

  if (duration.endsWith('h')) {
    const hours = parseInt(duration.replace('h', ''));
    if (isNaN(hours) || hours <= 0) {
      return sendPlainMessage(chatId, '❌ Durasi tidak valid! Gunakan angka positif.');
    }
    days = hours / 24;
    label = `${hours} Jam`;
  } else if (duration.endsWith('d')) {
    const d = parseInt(duration.replace('d', ''));
    if (isNaN(d) || d <= 0) {
      return sendPlainMessage(chatId, '❌ Durasi tidak valid! Gunakan angka positif.');
    }
    days = d;
    label = `${d} Hari`;
  } else {
    return sendPlainMessage(chatId,
      '❌ Format durasi salah!\n\nGunakan:\n├ 7h = 7 jam\n├ 7d = 7 hari\n├ 30d = 30 hari\n├ 90d = 90 hari\n└ 365d = 365 hari\n\nContoh: /addsewa 67626282626 30d'
    );
  }

  const userExists = users[userId];
  if (!userExists) {
    return sendPlainMessage(chatId, 
      `⚠️ User ID ${userId} belum terdaftar di database.\n\n📌 Pastikan user sudah pernah /start ke bot.`
    );
  }

  const sewaFile = path.join(__dirname, 'sewa_aktif.json');
  let sewaData = loadJSON(sewaFile);

  const now = Date.now();
  const expired = now + (days * 24 * 60 * 60 * 1000);

  if (sewaData[userId] && sewaData[userId].active && sewaData[userId].expired > now) {
    const oldExpired = sewaData[userId].expired;
    const newExpired = oldExpired + (days * 24 * 60 * 60 * 1000);
    
    sewaData[userId] = {
      duration: sewaData[userId].duration + ` +${label}`,
      start: sewaData[userId].start || now,
      expired: newExpired,
      active: true,
      start_date: sewaData[userId].start_date || new Date(now).toLocaleDateString('id-ID'),
      expired_date: new Date(newExpired).toLocaleDateString('id-ID'),
      daerah: sewaData[userId].daerah || [],
      last_extend: new Date(now).toLocaleDateString('id-ID')
    };
    
    saveJSON(sewaFile, sewaData);
    
    try {
      await bot.sendMessage(userId, 
        `🎉 SEWA DIPERPANJANG!\n\n📦 Paket: +${label}\n📅 Berakhir: ${new Date(newExpired).toLocaleDateString('id-ID')}\n\n✅ Sewa berhasil diperpanjang oleh Admin.`
      );
    } catch (e) {}

    return sendPlainMessage(chatId, 
      `✅ Sewa berhasil diperpanjang!\n\n👤 User: ${userId}\n📦 Paket: +${label}\n📅 Berakhir: ${new Date(newExpired).toLocaleDateString('id-ID')}\n\n📌 User sudah menerima notifikasi.`
    );
  }

  sewaData[userId] = {
    duration: label,
    start: now,
    expired: expired,
    active: true,
    start_date: new Date(now).toLocaleDateString('id-ID'),
    expired_date: new Date(expired).toLocaleDateString('id-ID'),
    daerah: [],
    added_by: 'admin_manual',
    added_at: new Date().toISOString()
  };

  saveJSON(sewaFile, sewaData);

  try {
    await bot.sendMessage(userId, 
      `🎉 SEWA BERHASIL DIAKTIFKAN!\n\n📦 Paket: ${label}\n📅 Mulai: ${new Date(now).toLocaleDateString('id-ID')}\n📅 Berakhir: ${new Date(expired).toLocaleDateString('id-ID')}\n\n📌 Sekarang tambahkan daerah:\n/tambah KABUPATEN > KECAMATAN > KELURAHAN\n\n✅ Selamat bot sudah aktif!`
    );
  } catch (e) {}

  sendPlainMessage(chatId, 
    `✅ Sewa berhasil ditambahkan!\n\n👤 User: ${userId}\n📦 Paket: ${label}\n📅 Mulai: ${new Date(now).toLocaleDateString('id-ID')}\n📅 Berakhir: ${new Date(expired).toLocaleDateString('id-ID')}\n\n📌 User sudah menerima notifikasi.`
  );
});

// ==========================================
// 🔥 CALLBACK QUERY HANDLER (FULL FIX)
// ==========================================

bot.on("callback_query", async (q) => {
  const data = q.data;
  const isAuth = isAuthorized(q.from.id);
  const chatId = q.message.chat.id;
  await bot.answerCallbackQuery(q.id);
  
// ==========================================
// 🔥 CALLBACK BATAL PAIRING
// ==========================================

if (data && data.startsWith('batal_pair_')) {
    const phone = data.replace('batal_pair_', '');
    
    for (const [chatId, status] of Object.entries(pairingStatus)) {
        if (status.phone === phone) {
            delete pairingStatus[chatId];
            break;
        }
    }
    
    try { await bot.deleteMessage(chatId, q.message.message_id); } catch (e) {}
    
    await axios.post('http://127.0.0.1:3005/stop-pairing', {}, { timeout: 5000 }).catch(() => {});
    await axios.post('http://127.0.0.1:3005/reset-session', {}, { timeout: 5000 }).catch(() => {});
    
    return;
}

// ==========================================
// 🔥 CALLBACK COPY KODE (KLIK LANGSUNG COPY)
// ==========================================

if (data && data.startsWith('copy_')) {
    const code = data.replace('copy_', '');
    
    await bot.answerCallbackQuery(q.id, { 
        text: `✅ Kode ${code} sudah di-copy!`, 
        show_alert: true 
    });
    
    return;
}
  
  // ==========================================
  // 🔥 CALLBACK LAINNYA
  // ==========================================
  
  if (data === "welcome_continue") {
    return handleWelcomeContinue(q, bot, sendNewMessage, users, isAuth);
  }

  if (data === "back_to_main" || data === "back_to_menu") {
    await menu.deleteAllMessages(bot, chatId);
    try { await bot.deleteMessage(chatId, q.message.message_id); } catch (e) {}
    await removeReplyKeyboard(bot, chatId);
    return menu.showMenu(chatId, isAuth, users, sendNewMessage, bot);
  }

  if (data === "owner_menu") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    return ownerMenu(bot, q, sendNewMessage, OWNER_ID);
  }

  if (data === "sewa_menu") {
    await removeReplyKeyboard(bot, chatId);
    return sewaBot.showSewaBotMenu(chatId, sendNewMessage, bot);
  }

  const handled = await sewaBot.handleSewaCallback(q, bot, sendPlainMessage, sendNewMessage);
  if (handled) return;
  
  if (data === "tambah_daerah") {
    await removeReplyKeyboard(bot, chatId);
    return menu.startTambahDaerah(chatId, bot, sendPlainMessage);
  }

  if (data === "profil_menu") {
    await removeReplyKeyboard(bot, chatId);
    return menu.showProfilMenu(chatId, sendNewMessage, bot);
  }

  if (data === "save_data_menu") {
    await removeReplyKeyboard(bot, chatId);
    return menu.showSaveDataMenu(chatId, sendNewMessage, bot);
  }
  
  if (data === "admin_menu") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    return adminMenu.showAdminMenu(chatId, sendNewMessage, bot);
  }

  if (data === "add_sewa_manual") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    sendPlainMessage(chatId, 
      `📖 ADD SEWA MANUAL\n\n📌 Format:\n/addsewa [user_id] [durasi]\n\n📝 Durasi: 7h, 7d, 30d, 90d, 365d\n\n📌 Contoh:\n/addsewa 67626282626 30d\n\n📌 Lihat bantuan:\n/addsewahelp`
    );
    return;
  }

  if (data === "del_sewa_manual") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    sendPlainMessage(chatId, 
      `📖 DELETE SEWA MANUAL\n\n📌 Format:\n/delsewa [user_id]\n\n📌 Contoh:\n/delsewa 67626282626\n\n📌 Lihat bantuan:\n/delsewahelp`
    );
    return;
  }
  
  if (data === "whatsapp_menu") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    return waMenu.showWhatsAppMenu(chatId, sendNewMessage, bot, sendNewMessageWithCleanup);
  }

  if (data === "pairwa_menu") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    return waMenu.showPairingMenu(chatId, sendNewMessage, bot, sendNewMessageWithCleanup);
  }

  if (data === "broadcastwa_menu") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    return waMenu.showBroadcastWAMenu(chatId, sendNewMessage, bot, sendNewMessageWithCleanup);
  }

  if (data === "statuswa") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    await deletePreviousMessage(chatId);
    
    const status = await bridgeTelegram.getWAStatus();
    if (!status) {
      return sendPlainMessage(chatId, '❌ WA Bot offline\nPastikan WA bot berjalan di port 3005');
    }
    
    let text = `📊 STATUS WHATSAPP BOT\n\n`;
    text += `📱 Status: ${status.connected ? '✅ Online' : '❌ Offline'}\n`;
    text += `📞 Nomor: ${status.phone || '-'}\n`;
    text += `👥 Kontak: ${status.contacts || 0}\n`;
    text += `⏱️ Uptime: ${formatUptime(status.uptime)}`;
    return sendPlainMessage(chatId, text);
  }

  if (data === "resetsession") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    await deletePreviousMessage(chatId);
    sendPlainMessage(chatId, '⏳ Menghapus session WhatsApp...');
    try {
      const response = await axios.post(`${WA_API_URL}/reset-session`);
      if (response.data.status === 'success') {
        return sendPlainMessage(chatId, '✅ Session WhatsApp berhasil dihapus!\n\nSilahkan pairing ulang dengan:\n/pair 628xxxxxxxxxx');
      } else {
        return sendPlainMessage(chatId, '❌ Gagal menghapus session');
      }
    } catch (error) {
      return sendPlainMessage(chatId, '❌ Gagal menghapus session\n\nPastikan WA Bot berjalan di port 3005');
    }
  }

  if (data === "restartwa") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    await deletePreviousMessage(chatId);
    sendPlainMessage(chatId, '⏳ Merestart WA Bot...');
    try {
      const { exec } = require('child_process');
      exec('pm2 restart wabot', (error) => {
        if (error) {
          return sendPlainMessage(chatId, '❌ Gagal restart WA Bot');
        }
        setTimeout(() => {
          return sendPlainMessage(chatId, '✅ WA Bot berhasil direstart!\n\nCek status dengan /statuswa');
        }, 2000);
      });
    } catch (error) {
      return sendPlainMessage(chatId, '❌ Gagal restart WA Bot');
    }
  }

  if (data === "logswa") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    await deletePreviousMessage(chatId);
    try {
      const { exec } = require('child_process');
      exec('pm2 logs wabot --lines 15 --nostream', (error, stdout, stderr) => {
        if (error) {
          return sendPlainMessage(chatId, '❌ Gagal mengambil logs');
        }
        const logs = stdout || stderr;
        if (logs.length > 4000) {
          return sendPlainMessage(chatId, '📋 LOG WA BOT (Terpotong)\n\n' + logs.slice(-3500));
        } else {
          return sendPlainMessage(chatId, '📋 LOG WA BOT\n\n' + logs);
        }
      });
    } catch (error) {
      return sendPlainMessage(chatId, '❌ Gagal mengambil logs');
    }
  }

  if (data === "repairwa") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    await deletePreviousMessage(chatId);
    sendPlainMessage(chatId, '🔧 REPAIR WHATSAPP BOT\n\n⏳ Menghapus session lama dan merestart WA Bot...');
    try {
      const response = await axios.post(`${WA_API_URL}/reset-session`);
      if (response.data.status === 'success') {
        const { exec } = require('child_process');
        exec('pm2 restart wabot', (error) => {
          if (error) {
            return sendPlainMessage(chatId, '❌ Gagal merestart WA Bot\n\nSilahkan restart manual: pm2 restart wabot');
          }
          setTimeout(() => {
            return sendPlainMessage(chatId, 
              '✅ REPAIR SELESAI!\n\n📱 Session WhatsApp berhasil dihapus\n🔄 WA Bot berhasil direstart\n\n🔑 Pairing ulang: /pair 628xxxxxxxxxx'
            );
          }, 3000);
        });
      } else {
        return sendPlainMessage(chatId, '❌ Gagal menghapus session');
      }
    } catch (error) {
      return sendPlainMessage(chatId, '❌ Gagal repair\n\nPastikan WA Bot berjalan di port 3005');
    }
  }

  if (data === "list_user") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    bot.emit('text', { chat: { id: chatId }, from: { id: q.from.id }, text: '/listuser' });
    return;
  }

  if (data === "broadcast_menu") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    sendPlainMessage(chatId, "📢 Gunakan format: /broadcast isi pesan");
    return;
  }

  if (data === "statistik") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    const sewaFile = path.join(__dirname, 'sewa_aktif.json');
    let sewaData = loadJSON(sewaFile);
    const aktif = Object.keys(sewaData).filter(id => sewaData[id].active).length;
    sendPlainMessage(chatId, 
      `📊 STATISTIK BOT\n\n👥 Total User: ${Object.keys(users).length}\n🤖 Sewa Aktif: ${aktif}\n📅 Total Sewa: ${Object.keys(sewaData).length}`
    );
    return;
  }

  if (data === "setting_bot") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    sendPlainMessage(chatId, 
      `⚙️ SETTING BOT\n\n📌 Commands yang tersedia:\n/sewa - Sewa bot\n/ceksewa - Cek sewa\n/savedata - Simpan data\n/lihatdata - Lihat data\n/hapusdata - Hapus data\n/start - Menu utama`
    );
    return;
  }

  if (data === "cek_transaksi") {
    if (!isAuth) {
        await bot.answerCallbackQuery(q.id, { text: '❌ Khusus owner/admin!' });
        return;
    }
    await removeReplyKeyboard(bot, chatId);
    const sewaFile = path.join(__dirname, 'sewa_aktif.json');
    let sewaData = loadJSON(sewaFile);
    const total = Object.keys(sewaData).length;
    const aktif = Object.keys(sewaData).filter(id => sewaData[id].active).length;
    sendPlainMessage(chatId, 
      `💰 TRANSAKSI SEWA\n\n📊 Total Transaksi: ${total}\n✅ Aktif: ${aktif}\n⏰ Expired: ${total - aktif}\n\n📌 Detail: /ceksewaall`
    );
    return;
  }
  
  if (data === "list_stok_admin") {
    await removeReplyKeyboard(bot, chatId);
    sendPlainMessage(chatId, '❌ Fitur stok telah dihapus.\n\nGunakan fitur SEWA BOT untuk akses!');
    return;
  }
  
  if (data === "hapus_daerah") {
    const chatId = q.message.chat.id;
    const sewaFile = path.join(__dirname, 'sewa_aktif.json');
    let sewaData = loadJSON(sewaFile);
    
    if (!sewaData[chatId] || !sewaData[chatId].daerah || sewaData[chatId].daerah.length === 0) {
      return sendPlainMessage(chatId, '❌ Tidak ada daerah yang bisa dihapus');
    }
    
    let buttons = [];
    sewaData[chatId].daerah.forEach((d, i) => {
      buttons.push([{ text: `🗑️ ${d}`, callback_data: `hapus_daerah_${i}` }]);
    });
    buttons.push([{ text: "🔙 Batal", callback_data: "back_to_profil" }]);
    
    await bot.sendMessage(chatId, 
      `📍 Pilih daerah yang ingin dihapus:\n\n📌 Klik tombol daerah yang ingin dihapus.`,
      { reply_markup: { inline_keyboard: buttons } }
    );
    return;
  }
  
  if (data && data.startsWith("hapus_daerah_")) {
    const chatId = q.message.chat.id;
    const index = parseInt(data.replace("hapus_daerah_", ""));
    const sewaFile = path.join(__dirname, 'sewa_aktif.json');
    let sewaData = loadJSON(sewaFile);
    
    if (!sewaData[chatId] || !sewaData[chatId].daerah || sewaData[chatId].daerah.length === 0) {
      return sendPlainMessage(chatId, '❌ Tidak ada daerah yang bisa dihapus');
    }
    if (index < 0 || index >= sewaData[chatId].daerah.length) {
      return sendPlainMessage(chatId, '❌ Daerah tidak ditemukan');
    }
    
    const hapusDaerah = sewaData[chatId].daerah[index];
    sewaData[chatId].daerah.splice(index, 1);
    saveJSON(sewaFile, sewaData);
    
    try {
      await axios.post('http://127.0.0.1:3005/api/sync-sewa-data', {
        sewaData: sewaData,
        timestamp: Date.now()
      }, { timeout: 5000 });
    } catch (e) {}
    
    try { await bot.deleteMessage(chatId, q.message.message_id); } catch (e) {}
    await sendPlainMessage(chatId, 
      `✅ Daerah berhasil dihapus!\n\n🗑️ ${hapusDaerah}\n\n📌 Data telah disinkronkan ke WA-Bot.`
    );
    setTimeout(async () => {
      await menu.showProfilMenu(chatId, sendPlainMessage, bot);
    }, 1500);
    return;
  }

  if (data === "back_to_profil") {
    const chatId = q.message.chat.id;
    try { await bot.deleteMessage(chatId, q.message.message_id); } catch (e) {}
    await menu.showProfilMenu(chatId, sendPlainMessage, bot);
    return;
  }
});

// ==========================================
// 🔥 AUTO CHECK SEWA EXPIRED (Setiap 1 Jam)
// ==========================================

setInterval(() => {
  const sewaFile = path.join(__dirname, 'sewa_aktif.json');
  if (!fs.existsSync(sewaFile)) return;
  
  try {
    let sewaData = loadJSON(sewaFile);
    let changed = false;
    const now = Date.now();
    
    for (const chatId in sewaData) {
      if (sewaData[chatId].active && sewaData[chatId].expired < now) {
        sewaData[chatId].active = false;
        changed = true;
        console.log(`⏰ Sewa expired untuk ${chatId}`);
        bot.sendMessage(chatId, 
          `⏰ Sewa Bot EXPIRED!\n\n📦 Paket: ${sewaData[chatId].duration}\n📅 Berakhir: ${sewaData[chatId].expired_date || new Date(sewaData[chatId].expired).toLocaleDateString('id-ID')}\n\n🔄 Perpanjang dengan /sewa`
        ).catch(() => {});
      }
    }
    
    if (changed) {
      saveJSON(sewaFile, sewaData);
    }
  } catch (e) {}
}, 60 * 60 * 1000);

// ==========================================
// 🔥 START BOT
// ==========================================

log("INFO", "Bot siap digunakan ✅");
console.log("🚀 Bot berjalan!");