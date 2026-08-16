// menu_admin.js - MENU ADMIN DENGAN TOMBOL REPLY
// SEMUA DATA MENGARAH KE WA-BOT (wabot/sewa_aktif.json)

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ==========================================
// 🔥 LOAD JSON HELPER
// ==========================================

const loadJSON = (file) => {
  try {
    if (!fs.existsSync(file)) return {};
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw || raw === '') return {};
    return JSON.parse(raw);
  } catch (err) {
    console.log(`❌ JSON ERROR ${file}:`, err.message);
    return {};
  }
};

const saveJSON = (file, data) => {
  try {
    if (!data || typeof data !== 'object') data = {};
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.log(`❌ SAVE ERROR ${file}:`, err.message);
  }
};

// ==========================================
// 🔥 KONFIGURASI WA-BOT
// ==========================================

const WA_API_URL = process.env.WA_API_URL || 'http://127.0.0.1:3005';
const WABOT_DATA_FOLDER = path.join('/root', 'wabot', 'data');

// ==========================================
// 🔥 SHOW ADMIN MENU
// ==========================================

const showAdminMenu = async (chatId, sendNewMessage, bot = null) => {
  const content = `
👑 *MENU ADMIN*

👥 List User
 └─ Lihat daftar pengguna bot (dari WA-Bot)
📢 Broadcast
 └─ Kirim pesan ke seluruh user
💰 Cek Transaksi
 └─ Cek riwayat transaksi
➕ Add Sewa Manual
 └─ Tambahkan masa sewa user (WA-Bot)
❌ Delete Sewa Manual
 └─ Hapus masa sewa user (WA-Bot)
🔍 Cek Status
 └─ Cek status user berdasarkan ID (WA-Bot)
⚙️ Setting Bot
 └─ Kelola konfigurasi bot
📊 Statistik
 └─ Lihat statistik penggunaan bot
`;

  const replyButtons = {
    keyboard: [
      [{ text: "👥 LIST USER" }, { text: "📢 BROADCAST" }],
      [{ text: "💰 CEK TRANSAKSI" }, { text: "➕ ADD SEWA" }],
      [{ text: "❌ DELETE SEWA" }, { text: "🔍 CEK STATUS" }],
      [{ text: "⚙️ SETTING" }, { text: "📊 STATISTIK" }],
      [{ text: "🔙 MENU" }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };

  if (bot) {
    try {
      const menuModule = require('./menu.js');
      await menuModule.deletePreviousMessage(bot, chatId);
    } catch (e) {
      if (global.menuMessageIds && global.menuMessageIds[chatId]) {
        try {
          await bot.deleteMessage(chatId, global.menuMessageIds[chatId]);
        } catch (e) {}
        delete global.menuMessageIds[chatId];
      }
    }
    
    const sent = await bot.sendMessage(chatId, content, {
      parse_mode: "Markdown",
      reply_markup: replyButtons
    });
    
    if (!global.menuMessageIds) global.menuMessageIds = {};
    global.menuMessageIds[chatId] = sent.message_id;
  } else {
    await sendNewMessage(chatId, content, {
      parse_mode: "Markdown",
      reply_markup: replyButtons
    });
  }
};

// ==========================================
// 🔥 LIST USER - BACA DARI WA-BOT
// ==========================================

const listUser = async (chatId, bot) => {
  console.log(`🔍 [LISTUSER] Dipanggil untuk chatId: ${chatId}`);
  
  const sewaFile = '/root/wabot/data/sewa_aktif.json';
  let sewaData = {};
  if (fs.existsSync(sewaFile)) {
    try {
      sewaData = JSON.parse(fs.readFileSync(sewaFile, 'utf8'));
      console.log(`✅ [LISTUSER] Total user: ${Object.keys(sewaData).length}`);
    } catch (e) {
      console.log(`❌ [LISTUSER] Error baca file:`, e.message);
      return bot.sendMessage(chatId, `❌ Gagal baca data: ${e.message}`);
    }
  } else {
    console.log(`❌ [LISTUSER] File tidak ditemukan: ${sewaFile}`);
    return bot.sendMessage(chatId, `❌ File data tidak ditemukan!\n\n📌 Path: ${sewaFile}`);
  }

  const userList = Object.keys(sewaData);
  if (userList.length === 0) {
    return bot.sendMessage(chatId, '❌ Belum ada user yang terdaftar');
  }

  const usersFile = path.join(__dirname, 'users.json');
  let users = {};
  if (fs.existsSync(usersFile)) {
    try {
      users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    } catch (e) {}
  }

  let lines = [];
  lines.push(`📋 *LIST USER (${userList.length} USER)*`);
  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  let aktif = 0;
  let expired = 0;
  
  userList.forEach((id, i) => {
    const sewa = sewaData[id];
    const user = users[id] || {};
    const username = user.username || '-';
    
    let status = '❌ NONAKTIF';
    let daerahCount = 0;
    let paket = '-';
    
    if (sewa) {
      const now = Date.now();
      const expiredTime = sewa.expired === 'Forever' ? Infinity : sewa.expired;
      
      if (sewa.active && (expiredTime === Infinity || expiredTime > now)) {
        status = '✅ AKTIF';
        aktif++;
      } else if (sewa.active && expiredTime !== Infinity && expiredTime <= now) {
        status = '⏰ EXPIRED';
        expired++;
      } else {
        status = '❌ NONAKTIF';
      }
      
      paket = sewa.duration || '-';
      if (sewa.daerah) daerahCount = sewa.daerah.length;
    }
    
    const shortUsername = username.length > 15 ? username.substring(0, 15) + '..' : username;
    
    lines.push(`${i+1}. ID: ${id}`);
    lines.push(`   👤 ${shortUsername}`);
    lines.push(`   📦 ${paket}`);
    lines.push(`   ${status} | ${daerahCount} daerah`);
    lines.push(``);
  });
  
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📊 RINGKASAN`);
  lines.push(`➥ Total: ${userList.length}`);
  lines.push(`➥ Aktif: ${aktif}`);
  lines.push(`➥ Expired: ${expired}`);

  let teks = lines.join('\n');

  const adminKeyboard = {
    keyboard: [
      [{ text: "👥 LIST USER" }, { text: "📢 BROADCAST" }],
      [{ text: "💰 CEK TRANSAKSI" }, { text: "➕ ADD SEWA" }],
      [{ text: "❌ DELETE SEWA" }, { text: "🔍 CEK STATUS" }],
      [{ text: "⚙️ SETTING" }, { text: "📊 STATISTIK" }],
      [{ text: "🔙 MENU" }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };

  try {
    await bot.sendMessage(chatId, teks, {
      reply_markup: adminKeyboard
    });
    console.log(`✅ [LISTUSER] Berhasil dikirim ke ${chatId}`);
  } catch (err) {
    console.log(`❌ [LISTUSER] Error kirim:`, err.message);
    const plainText = teks.replace(/[*_`]/g, '');
    try {
      await bot.sendMessage(chatId, plainText, {
        reply_markup: adminKeyboard
      });
    } catch (e) {
      console.log(`❌ [LISTUSER] Fallback error:`, e.message);
      await bot.sendMessage(chatId, '❌ Gagal menampilkan list user');
    }
  }
};

// ==========================================
// 🔥 CEK STATUS USER - BACA DARI WA-BOT
// ==========================================

const cekStatusUser = async (chatId, userId, sendMessage) => {
  const bot = global.telegramBot;
  
  if (!userId) {
    const msg = `❌ *Format salah!*\n\nGunakan: /cekstatus [user_id]\n📌 *Contoh:* /cekstatus 123456789`;
    if (bot) return bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    return sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  }

  const cleanUserId = userId.replace(/[^0-9]/g, '');
  if (!cleanUserId) {
    const msg = `❌ *User ID tidak valid!*\n\nGunakan hanya angka.`;
    if (bot) return bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    return sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  }

  const sewaFile = path.join(WABOT_DATA_FOLDER, 'sewa_aktif.json');
  let sewaData = {};
  if (fs.existsSync(sewaFile)) {
    try {
      sewaData = JSON.parse(fs.readFileSync(sewaFile, 'utf8'));
    } catch (e) {
      console.log(`[CEKSTATUS] ❌ Error baca sewa_aktif.json:`, e.message);
    }
  } else {
    const msg = `⚠️ File data WA-Bot tidak ditemukan!\n\n📌 Pastikan WA-Bot sudah berjalan.`;
    if (bot) return bot.sendMessage(chatId, msg);
    return sendMessage(chatId, msg);
  }

  const sewa = sewaData[cleanUserId];
  const usersFile = path.join(__dirname, 'users.json');
  const users = loadJSON(usersFile);
  const user = users[cleanUserId];

  if (!sewa && !user) {
    const msg = `❌ User ID \`${cleanUserId}\` tidak ditemukan.\n\n📌 Cek daftar user: /listuser`;
    if (bot) return bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    return sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  }

  let teks = `👤 *STATUS USER (WA-BOT)*\n\n`;
  teks += `📱 *ID:* \`${cleanUserId}\`\n`;
  teks += `👤 *Username:* ${user?.username || '-'}\n`;
  teks += `📅 *Bergabung:* ${user?.date ? new Date(user.date).toLocaleDateString('id-ID') : '-'}\n\n`;

  if (sewa) {
    const now = Date.now();
    const expired = sewa.expired === 'Forever' ? Infinity : sewa.expired;
    const isActive = sewa.active && (expired === Infinity || expired > now);
    
    teks += `📦 *Paket:* ${sewa.duration || '-'}\n`;
    teks += `📅 *Mulai:* ${sewa.start_date || '-'}\n`;
    teks += `📅 *Berakhir:* ${sewa.expired_date || '-'}\n`;
    teks += `📊 *Status:* ${isActive ? '✅ AKTIF' : '⏰ EXPIRED'}\n`;
    
    if (expired !== Infinity && !isActive) {
      teks += `⏳ *Expired sejak:* ${new Date(expired).toLocaleDateString('id-ID')}\n`;
    } else if (expired !== Infinity) {
      teks += `⏳ *Sisa:* ${Math.ceil((expired - now) / (1000 * 60 * 60 * 24))} hari\n`;
    } else {
      teks += `⏳ *Sisa:* ♾️ Forever\n`;
    }

    if (sewa.daerah && sewa.daerah.length > 0) {
      teks += `\n📍 *Daerah Terdaftar:*\n`;
      sewa.daerah.forEach((d, i) => { teks += `  ${i+1}. ${d}\n`; });
    } else {
      teks += `\n📍 *Daerah:* Belum ada\n`;
    }
  } else {
    teks += `\n❌ *Belum ada data sewa*`;
  }

  teks += `\n\n📌 *Data diambil dari WA-Bot (${sewaFile})*`;

  if (bot) {
    return bot.sendMessage(chatId, teks, { parse_mode: 'Markdown' });
  }
  return sendMessage(chatId, teks, { parse_mode: 'Markdown' });
};

// ==========================================
// 🔥 DELETE SEWA - HAPUS SEWA TAPI DAERAH TETAP!
// ==========================================

const deleteSewa = async (chatId, userId, sendMessage, bot = null) => {
  const botTele = bot || global.telegramBot;
  
  if (!userId) {
    const msg = `❌ Format salah!\n\nGunakan: /delsewa [user_id]\n📌 Contoh: /delsewa 123456789`;
    if (botTele) return botTele.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    return sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  }

  const sewaFile = path.join(WABOT_DATA_FOLDER, 'sewa_aktif.json');
  let sewaData = {};
  if (fs.existsSync(sewaFile)) {
    try {
      sewaData = JSON.parse(fs.readFileSync(sewaFile, 'utf8'));
    } catch (e) {
      console.log(`❌ Error baca sewa_aktif.json:`, e.message);
    }
  }

  if (!sewaData[userId]) {
    const msg = `❌ User ID ${userId} tidak ditemukan.`;
    if (botTele) return botTele.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    return sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  }

  const userData = sewaData[userId];
  const daerahLama = userData.daerah || [];
  const username = userData.username || userId;

  sewaData[userId] = {
    daerah: daerahLama,
    username: username,
    active: false,
    duration: 'Dihapus Admin',
    start: null,
    expired: null,
    start_date: '-',
    expired_date: '-',
    deleted_at: new Date().toISOString(),
    deleted_by: 'admin'
  };

  try {
    fs.writeFileSync(sewaFile, JSON.stringify(sewaData, null, 2), 'utf8');
    console.log(`✅ [DELSEWA] Sewa user ${userId} dihapus, daerah tetap: ${daerahLama.length} daerah`);
  } catch (e) {
    console.log(`❌ [DELSEWA] Gagal simpan:`, e.message);
  }

  try {
    await axios.post('http://127.0.0.1:3005/api/sync-sewa-data', {
      sewaData: sewaData,
      timestamp: Date.now()
    }, { timeout: 5000 });
    console.log(`✅ [DELSEWA] Sync ke API WA-Bot berhasil`);
  } catch (e) {
    console.log(`⚠️ [DELSEWA] API WA-Bot tidak merespon:`, e.message);
  }

  try {
    await axios.post('http://localhost:3004/sync-all-to-wabot', {
      sewaData: sewaData,
      daerahData: {},
      timestamp: Date.now()
    }, { timeout: 5000 });
    console.log(`✅ [DELSEWA] Sync ke Bridge berhasil`);
  } catch (e) {
    console.log(`⚠️ [DELSEWA] Bridge tidak merespon:`, e.message);
  }

  try {
    if (global.telegramBot) {
      await global.telegramBot.sendMessage(userId, 
        `⛔ *Sewa Anda telah dihapus oleh Admin!*\n\n` +
        `📦 Paket: ${userData.duration || '-'}\n` +
        `📅 Berakhir: ${userData.expired_date || '-'}\n\n` +
        `📍 *Daerah Anda tetap tersimpan:*\n` +
        `${daerahLama.map((d, i) => `${i+1}. ${d}`).join('\n')}\n\n` +
        `📌 Silahkan sewa ulang untuk mengaktifkan kembali:\n` +
        `/sewa`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (e) {
    console.log(`❌ Gagal notifikasi user ${userId}:`, e.message);
  }

  const msg = `✅ *Sewa berhasil dihapus!*\n\n` +
    `👤 User ID: ${userId}\n` +
    `📦 Paket: ${userData.duration || '-'}\n` +
    `📍 Daerah tetap: ${daerahLama.length} daerah\n` +
    `📅 Dihapus: ${new Date().toISOString()}`;
  
  if (botTele) {
    return botTele.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  }
  return sendMessage(chatId, msg, { parse_mode: 'Markdown' });
};

// ==========================================
// 🔥 ADD SEWA MANUAL - LANGSUNG KE WA-BOT
// ==========================================

const addSewaManual = async (chatId, userId, duration, sendMessage) => {
  const bot = global.telegramBot;
  
  if (!userId || !duration) {
    const msg = `❌ Format salah!\n\n/addsewa [user_id] [durasi]\n📝 Durasi: 7h, 7d, 30d, 90d, 365d\n📌 Contoh: /addsewa 123456789 30d`;
    if (bot) return bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    return sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  }

  let days = 0, label = '';
  
  if (duration.endsWith('h')) {
    const hours = parseInt(duration.replace('h', ''));
    if (isNaN(hours) || hours <= 0) {
      return sendMessage(chatId, '❌ Durasi tidak valid!');
    }
    days = hours / 24;
    label = `${hours} Jam`;
  } else if (duration.endsWith('d')) {
    const d = parseInt(duration.replace('d', ''));
    if (isNaN(d) || d <= 0) {
      return sendMessage(chatId, '❌ Durasi tidak valid!');
    }
    days = d;
    label = `${d} Hari`;
  } else {
    return sendMessage(chatId, `❌ Format durasi salah!\nGunakan: 7h, 7d, 30d, 90d, 365d`, { parse_mode: 'Markdown' });
  }

  const sewaFile = '/root/wabot/data/sewa_aktif.json';
  let sewaData = {};
  
  if (fs.existsSync(sewaFile)) {
    try {
      sewaData = JSON.parse(fs.readFileSync(sewaFile, 'utf8'));
    } catch (e) {
      console.log(`❌ Error baca sewa_aktif.json:`, e.message);
    }
  }

  const now = Date.now();
  const expired = now + (days * 24 * 60 * 60 * 1000);

  const usersFile = path.join(__dirname, 'users.json');
  const users = loadJSON(usersFile);
  const username = users[userId]?.username || userId;

  const daerahLama = sewaData[userId]?.daerah || [];

  if (sewaData[userId] && sewaData[userId].active) {
    const oldExpired = sewaData[userId].expired;
    const newExpired = oldExpired + (days * 24 * 60 * 60 * 1000);
    
    sewaData[userId] = {
      ...sewaData[userId],
      duration: sewaData[userId].duration + ` +${label}`,
      expired: newExpired,
      expired_date: new Date(newExpired).toLocaleDateString('id-ID'),
      username: username,
      last_extend: new Date().toLocaleDateString('id-ID')
    };
  } else {
    sewaData[userId] = {
      duration: label,
      start: now,
      expired: expired,
      active: true,
      start_date: new Date(now).toLocaleDateString('id-ID'),
      expired_date: new Date(expired).toLocaleDateString('id-ID'),
      daerah: daerahLama,
      username: username,
      added_by: 'admin',
      added_at: new Date().toISOString()
    };
  }

  try {
    fs.writeFileSync(sewaFile, JSON.stringify(sewaData, null, 2), 'utf8');
    console.log(`✅ [ADDSEWA] User ${userId} ditambahkan ke ${sewaFile}`);
    console.log(`📊 Total user di WA-BOT: ${Object.keys(sewaData).length}`);
  } catch (e) {
    console.log(`❌ [ADDSEWA] Gagal simpan:`, e.message);
    return sendMessage(chatId, `❌ Gagal simpan data!`);
  }

  try {
    await axios.post('http://127.0.0.1:3005/api/sync-sewa-data', {
      sewaData: sewaData,
      timestamp: Date.now()
    }, { timeout: 5000 });
    console.log(`✅ [ADDSEWA] Sync ke API WA-Bot berhasil`);
  } catch (e) {
    console.log(`⚠️ [ADDSEWA] API WA-Bot tidak merespon`);
  }

  try {
    await axios.post('http://localhost:3004/sync-all-to-wabot', {
      sewaData: sewaData,
      daerahData: {},
      timestamp: Date.now()
    }, { timeout: 5000 });
    console.log(`✅ [ADDSEWA] Sync ke Bridge berhasil`);
  } catch (e) {
    console.log(`⚠️ [ADDSEWA] Bridge tidak merespon`);
  }

  // ❌ TIDAK ADA NOTIF KE USER!

  const msg = `✅ *Sewa berhasil ditambahkan ke WA-Bot!*\n\n` +
    `👤 User ID: \`${userId}\`\n` +
    `👤 Username: ${username}\n` +
    `📦 Paket: ${label}\n` +
    `📅 Mulai: ${new Date(now).toLocaleDateString('id-ID')}\n` +
    `📅 Berakhir: ${new Date(expired).toLocaleDateString('id-ID')}\n` +
    `📍 Daerah tetap: ${daerahLama.length} daerah`;
  
  if (bot) {
    return bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  }
  return sendMessage(chatId, msg, { parse_mode: 'Markdown' });
};

// ==========================================
// 🔥 SYNC KE WA-BOT
// ==========================================

async function syncToWABot() {
  try {
    const sewaFile = path.join(WABOT_DATA_FOLDER, 'sewa_aktif.json');
    const sewa = loadJSON(sewaFile);
    
    await axios.post(`${WA_API_URL}/api/sync-sewa-data`, {
      sewaData: sewa,
      timestamp: Date.now()
    }, { timeout: 5000 });
    console.log('✅ [SYNC] Data tersync ke WA-Bot');
    return true;
  } catch (error) {
    console.log('⚠️ [SYNC] Gagal sync ke WA-Bot:', error.message);
    return false;
  }
}

// ==========================================
// 🔥 HANDLE ADMIN COMMAND
// ==========================================

const handleAdminCommand = async (bot, msg, sendMessage) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const botTele = bot || global.telegramBot;
  
  if (text === '/listuser' || text === '👥 LIST USER') {
    return await listUser(chatId, sendMessage);
  }

  if (text.match(/^\/delsewa\s+/i)) {
    const userId = text.replace(/^\/delsewa\s+/i, '').trim();
    return await deleteSewa(chatId, userId, sendMessage, botTele);
  }

  if (text.match(/^\/cekstatus\s+/i)) {
    const userId = text.replace(/^\/cekstatus\s+/i, '').trim();
    return await cekStatusUser(chatId, userId, sendMessage);
  }

  if (text.match(/^\/addsewa\s+/i)) {
    const parts = text.replace(/^\/addsewa\s+/i, '').trim().split(/\s+/);
    if (parts.length < 2) {
      const msg = `❌ Format salah!\n/addsewa [user_id] [durasi]\nContoh: /addsewa 123456789 30d`;
      if (botTele) return botTele.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
      return sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    }
    return await addSewaManual(chatId, parts[0], parts[1], sendMessage);
  }

  if (text === '🔙 MENU' || text === '/menu') {
    try {
      const menuModule = require('./menu.js');
      await menuModule.deleteAllMessages(botTele, chatId);
      await menuModule.removeReplyKeyboard(botTele, chatId);
    } catch (e) {
      console.log('❌ Gagal hapus pesan:', e.message);
    }
    
    const menu = require('./menu');
    const isOwner = msg.from.id === require('./config').BOT.OWNER_ID;
    const users = loadJSON(path.join(__dirname, 'users.json'));
    await menu.showMenu(chatId, isOwner, users, sendMessage, botTele);
    return true;
  }

  return false;
};

// ==========================================
// 🔥 SHOW BROADCAST MENU (PILIHAN)
// ==========================================

const showBroadcastMenu = async (chatId, sendMessage, bot = null) => {
  const botTele = bot || global.telegramBot;
  
  const content = `
📢 *MENU BROADCAST*

Pilih jenis broadcast yang ingin dikirim:
📝 *Text Biasa*
/broadcast [pesan]
🏷️ *Text + Tag @ALL*
/broadcasttag [pesan]
📌 *Text + Semat (Pin)*
/broadcastpin [pesan]
📸 *Foto + Caption*
Kirim foto dengan caption:
/broadcastfoto [caption]
🏷️ *Foto + Tag @ALL*
Kirim foto dengan caption:
/broadcastfototag [caption]
📌 *Foto + Semat (Pin)*
Kirim foto dengan caption:
/broadcastfotopin [caption]
🎥 *Video + Caption*
Kirim video dengan caption:
/broadcastvideo [caption]
🏷️ *Video + Tag @ALL*
Kirim video dengan caption:
/broadcastvideotag [caption]
📌 *Video + Semat (Pin)*
Kirim video dengan caption:
/broadcastvideopin [caption]
━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Lepas Semat (Unpin)*
/unpin - Lepas semat di chat ini
/unpin [user_id] - Lepas semat user tertentu
/unpinall - Lepas semat SEMUA user
📌 *Contoh:*
/broadcasttag Pengumuman penting!
📌 *Kembali ke menu admin:*
klik tombol 🔙 ADMIN
`;

  const buttons = {
    keyboard: [
      [{ text: "📝 BROADCAST TEXT" }, { text: "🏷️ BROADCAST TAG" }],
      [{ text: "📌 BROADCAST PIN" }, { text: "📸 BROADCAST FOTO" }],
      [{ text: "🏷️ FOTO + TAG" }, { text: "📌 FOTO + PIN" }],
      [{ text: "🎥 BROADCAST VIDEO" }, { text: "🏷️ VIDEO + TAG" }],
      [{ text: "📌 VIDEO + PIN" }],
      [{ text: "📌 LEPAS SEMAT" }, { text: "🔙 ADMIN" }]  // 🔥 TOMBOLNYA DI SINI!
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };

  if (botTele) {
    const sent = await botTele.sendMessage(chatId, content, {
      parse_mode: "Markdown",
      reply_markup: buttons
    });
    if (!global.broadcastMenuIds) global.broadcastMenuIds = {};
    global.broadcastMenuIds[chatId] = sent.message_id;
  } else {
    await sendMessage(chatId, content, {
      parse_mode: "Markdown",
      reply_markup: buttons
    });
  }
};

// ==========================================
// 🔥 HANDLE BROADCAST BUTTONS
// ==========================================

const handleBroadcastButtons = async (chatId, text, sendMessage, bot = null) => {
  const botTele = bot || global.telegramBot;
  
  // Hapus pesan broadcast menu
  try {
    if (global.broadcastMenuIds && global.broadcastMenuIds[chatId]) {
      await botTele.deleteMessage(chatId, global.broadcastMenuIds[chatId]);
      delete global.broadcastMenuIds[chatId];
    }
  } catch (e) {}
  
  switch (text) {
    case '📝 BROADCAST TEXT':
      await sendMessage(chatId, 
        `📝 *BROADCAST TEXT*\n\n` +
        `Kirim perintah:\n` +
        `/broadcast [pesan]\n\n` +
        `📌 *Contoh:*\n` +
        `/broadcast Halo semua!`,
        { parse_mode: 'Markdown' }
      );
      break;
      
    case '🏷️ BROADCAST TAG':
      await sendMessage(chatId, 
        `🏷️ *BROADCAST + TAG @ALL*\n\n` +
        `Kirim perintah:\n` +
        `/broadcasttag [pesan]\n\n` +
        `📌 *Contoh:*\n` +
        `/broadcasttag Pengumuman penting untuk semua member!`,
        { parse_mode: 'Markdown' }
      );
      break;
      
    case '📌 BROADCAST PIN':
      await sendMessage(chatId, 
        `📌 *BROADCAST + SEMAT (PIN)*\n\n` +
        `Kirim perintah:\n` +
        `/broadcastpin [pesan]\n\n` +
        `📌 *Contoh:*\n` +
        `/broadcastpin Pengumuman penting!`,
        { parse_mode: 'Markdown' }
      );
      break;
      
    case '📸 BROADCAST FOTO':
      await sendMessage(chatId, 
        `📸 *BROADCAST FOTO*\n\n` +
        `Kirim foto dengan caption:\n` +
        `/broadcastfoto [caption]\n\n` +
        `📌 *Contoh:*\n` +
        `(kirim foto dengan caption)\n` +
        `/broadcastfoto Ini foto pengumuman!`,
        { parse_mode: 'Markdown' }
      );
      break;
      
    case '🏷️ FOTO + TAG':
      await sendMessage(chatId, 
        `🏷️ *BROADCAST FOTO + TAG @ALL*\n\n` +
        `Kirim foto dengan caption:\n` +
        `/broadcastfototag [caption]\n\n` +
        `📌 *Contoh:*\n` +
        `(kirim foto dengan caption)\n` +
        `/broadcastfototag Ini foto pengumuman untuk semua!`,
        { parse_mode: 'Markdown' }
      );
      break;
      
    case '📌 FOTO + PIN':
      await sendMessage(chatId, 
        `📌 *BROADCAST FOTO + SEMAT (PIN)*\n\n` +
        `Kirim foto dengan caption:\n` +
        `/broadcastfotopin [caption]\n\n` +
        `📌 *Contoh:*\n` +
        `(kirim foto dengan caption)\n` +
        `/broadcastfotopin Ini foto pengumuman!`,
        { parse_mode: 'Markdown' }
      );
      break;
      
    case '🎥 BROADCAST VIDEO':
      await sendMessage(chatId, 
        `🎥 *BROADCAST VIDEO*\n\n` +
        `Kirim video dengan caption:\n` +
        `/broadcastvideo [caption]\n\n` +
        `📌 *Contoh:*\n` +
        `(kirim video dengan caption)\n` +
        `/broadcastvideo Ini video pengumuman!`,
        { parse_mode: 'Markdown' }
      );
      break;
      
    case '🏷️ VIDEO + TAG':
      await sendMessage(chatId, 
        `🏷️ *BROADCAST VIDEO + TAG @ALL*\n\n` +
        `Kirim video dengan caption:\n` +
        `/broadcastvideotag [caption]\n\n` +
        `📌 *Contoh:*\n` +
        `(kirim video dengan caption)\n` +
        `/broadcastvideotag Ini video untuk semua member!`,
        { parse_mode: 'Markdown' }
      );
      break;
      
    case '📌 VIDEO + PIN':
      await sendMessage(chatId, 
        `📌 *BROADCAST VIDEO + SEMAT (PIN)*\n\n` +
        `Kirim video dengan caption:\n` +
        `/broadcastvideopin [caption]\n\n` +
        `📌 *Contoh:*\n` +
        `(kirim video dengan caption)\n` +
        `/broadcastvideopin Ini video pengumuman!`,
        { parse_mode: 'Markdown' }
      );
      break;
      
    case '🔙 ADMIN':
      // Kembali ke menu admin
      const menuModule = require('./menu');
      const isOwner = require('./config').BOT.OWNER_ID;
      // Hapus broadcast menu
      try {
        if (global.broadcastMenuIds && global.broadcastMenuIds[chatId]) {
          await botTele.deleteMessage(chatId, global.broadcastMenuIds[chatId]);
          delete global.broadcastMenuIds[chatId];
        }
      } catch (e) {}
      return showAdminMenu(chatId, sendMessage, botTele);
      
    default:
      return false;
  }
  
  // Tampilkan menu broadcast lagi setelah 3 detik
  setTimeout(async () => {
    await showBroadcastMenu(chatId, sendMessage, botTele);
  }, 3000);
  
  return true;
};

// ==========================================
// 🔥 EXPORT
// ==========================================

module.exports = {
  showAdminMenu,
  showBroadcastMenu,
  handleBroadcastButtons,
  listUser,
  deleteSewa,
  cekStatusUser,
  addSewaManual,
  handleAdminCommand,
  syncToWABot
};