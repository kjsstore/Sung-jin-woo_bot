// ==========================================
// 🔥 MENU.JS - FIXED + SYNC KE WA-BOT (TANPA SAVE DATA)
// ==========================================

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const waMenu = require("./menu_wa");
const sewaBot = require("./menu_sewa_bot");
const adminMenu = require("./menu_admin");

// Store last message IDs for each chat
const lastMessages = {};

// 🔥 GANTI VIDEO KE JPG
const IMAGE_URL = "https://files.catbox.moe/j9a12z.png"; // Ganti dengan URL JPG kamu

// ==========================================
// 🔥 KONFIGURASI BRIDGE
// ==========================================

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://127.0.0.1:3004';
const WA_API_URL = process.env.WA_API_URL || 'http://127.0.0.1:3005';

// ==========================================
// 🔥 FUNCTION DELETE PREVIOUS MESSAGE
// ==========================================

const deletePreviousMessage = async (bot, chatId) => {
  if (lastMessages[chatId]) {
    try {
      await bot.deleteMessage(chatId, lastMessages[chatId]);
      delete lastMessages[chatId];
    } catch (err) {
      console.log(`Gagal hapus pesan di ${chatId}: ${err.message}`);
    }
  }
};

// ==========================================
// 🔥 FUNGSI HAPUS REPLY KEYBOARD
// ==========================================

const removeReplyKeyboard = async (bot, chatId) => {
  try {
    // Kirim pesan kosong dengan remove_keyboard: true
    const sent = await bot.sendMessage(chatId, '⚡', {
      reply_markup: {
        remove_keyboard: true
      }
    });
    console.log(`✅ [KEYBOARD] Removed for ${chatId}`);
    
    // 🔥 HAPUS PESAN "⚡" SETELAH 1 DETIK
    setTimeout(async () => {
      try {
        await bot.deleteMessage(chatId, sent.message_id);
        console.log(`🗑️ [KEYBOARD] Pesan hapus keyboard dihapus untuk ${chatId}`);
      } catch (e) {
        // Abaikan error jika pesan sudah terhapus
      }
    }, 1000);
    
    return true;
  } catch (error) {
    console.log(`❌ [KEYBOARD] Failed to remove: ${error.message}`);
    return false;
  }
};

// ==========================================
// 🔥 SEND IMAGE WITH CLEANUP (GANTI VIDEO)
// ==========================================

const sendImageWithCleanup = async (bot, chatId, caption, options = {}) => {
  await deletePreviousMessage(bot, chatId);
  let sentMessage;
  
  try {
    sentMessage = await bot.sendPhoto(chatId, IMAGE_URL, {
      caption: caption,
      parse_mode: options.parse_mode || "HTML",
      reply_markup: options.reply_markup
    });
  } catch (err) {
    // FALLBACK: Kirim text aja kalo gambar gagal
    console.log(`⚠️ Gagal kirim gambar, fallback ke text: ${err.message}`);
    sentMessage = await bot.sendMessage(chatId, caption, options);
  }
  
  if (sentMessage && sentMessage.message_id) {
    lastMessages[chatId] = sentMessage.message_id;
  }
  return sentMessage;
};

// ==========================================
// 🔥 SEND NEW MESSAGE WITH CLEANUP
// ==========================================

const sendNewMessageWithCleanup = async (bot, chatId, content, options = {}, photoUrl = null, useImage = false) => {
  await deletePreviousMessage(bot, chatId);
  let sentMessage;

  // 🔥 PAKE IMAGE KALAU useImage = true
  if (useImage) {
    try {
      sentMessage = await bot.sendPhoto(chatId, photoUrl || IMAGE_URL, {
        caption: content,
        parse_mode: options.parse_mode || "HTML",
        reply_markup: options.reply_markup
      });
    } catch (err) {
      console.log(`⚠️ Gagal kirim gambar, fallback ke text: ${err.message}`);
      sentMessage = await bot.sendMessage(chatId, content, options);
    }
  } else if (photoUrl) {
    try {
      sentMessage = await bot.sendPhoto(chatId, photoUrl, {
        caption: content,
        parse_mode: options.parse_mode || "HTML",
        reply_markup: options.reply_markup
      });
    } catch (err) {
      sentMessage = await bot.sendMessage(chatId, content, options);
    }
  } else {
    sentMessage = await bot.sendMessage(chatId, content, options);
  }

  if (sentMessage && sentMessage.message_id) {
    lastMessages[chatId] = sentMessage.message_id;
  }
  return sentMessage;
};

// ==========================================
// 🔥 FUNGSI HAPUS SEMUA PESAN UNTUK CHAT
// ==========================================

const deleteAllMessages = async (bot, chatId) => {
    try {
        // Hapus dari lastMessages (menu utama)
        if (lastMessages && lastMessages[chatId]) {
            await bot.deleteMessage(chatId, lastMessages[chatId]);
            delete lastMessages[chatId];
            console.log(`🗑️ [DELETE ALL] Hapus lastMessages untuk ${chatId}`);
        }
        
        // Hapus dari global.lastQRMessage (menu sewa)
        if (global.lastQRMessage && global.lastQRMessage[chatId]) {
            await bot.deleteMessage(chatId, global.lastQRMessage[chatId]);
            delete global.lastQRMessage[chatId];
            console.log(`🗑️ [DELETE ALL] Hapus lastQRMessage untuk ${chatId}`);
        }
        
        // Hapus dari global.menuMessageIds (menu WA)
        if (global.menuMessageIds && global.menuMessageIds[chatId]) {
            await bot.deleteMessage(chatId, global.menuMessageIds[chatId]);
            delete global.menuMessageIds[chatId];
            console.log(`🗑️ [DELETE ALL] Hapus menuMessageIds untuk ${chatId}`);
        }
        
        console.log(`✅ [DELETE ALL] Semua pesan dihapus untuk ${chatId}`);
        return true;
    } catch (error) {
        console.log(`⚠️ [DELETE ALL] Gagal hapus: ${error.message}`);
        return false;
    }
};

// ==========================================
// 🔥 WELCOME SCREEN (PERTAMA KALI USER START) - WITH FILE STORAGE
// ==========================================

const WELCOME_FILE = path.join(__dirname, 'welcome_shown.json');

// 🔥 LOAD DATA WELCOME DARI FILE
const loadWelcomeData = () => {
    try {
        if (!fs.existsSync(WELCOME_FILE)) {
            fs.writeFileSync(WELCOME_FILE, JSON.stringify({}, null, 2));
            return {};
        }
        const raw = fs.readFileSync(WELCOME_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        console.log(`❌ [WELCOME] Gagal load data: ${error.message}`);
        return {};
    }
};

// 🔥 SAVE DATA WELCOME KE FILE
const saveWelcomeData = (data) => {
    try {
        fs.writeFileSync(WELCOME_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.log(`❌ [WELCOME] Gagal save data: ${error.message}`);
    }
};

// 🔥 CEK APAKAH USER SUDAH LIHAT WELCOME
const hasSeenWelcome = (chatId) => {
    const data = loadWelcomeData();
    return data[chatId] || false;
};

// 🔥 TANDAI USER SUDAH LIHAT WELCOME
const markWelcomeSeen = (chatId) => {
    const data = loadWelcomeData();
    data[chatId] = true;
    saveWelcomeData(data);
};

const showWelcomeScreen = async (chatId, username, sendNewMessage, bot = null) => {
    // 🔥 TANDAI USER SUDAH LIHAT WELCOME (SIMPAN KE FILE)
    markWelcomeSeen(chatId);
    
const content = `

<blockquote>
<b>👋 Halo @${username || chatId}!</b>

Saya adalah asisten bot yang dibuat untuk membantu Anda menemukan informasi yang dibagikan di berbagai grup WhatsApp secara lebih mudah dan terorganisir.

📌 <b>Fungsi Bot:</b>
├ 🔍 Memantau data sesuai daerah
├ 💾 Menyimpan daerah yang Anda pilih
├ 🤖 Mendeteksi informasi secara otomatis
└ 📩 Mengirim notifikasi langsung ke ID Anda

📌 <b>Keamanan:</b>
Untuk keamanan transaksi, tersedia rekomendasi <b>Admin Rekber</b>.
Anda juga bebas menggunakan admin andalan Anda sendiri selama terpercaya.

⚠️ <b>Gunakan bot dengan bijak.</b>
Hormati privasi dan jangan menyalahgunakan informasi yang diperoleh.

Jika Anda sudah memahami maksud dan cara penggunaan bot ini, silakan klik <b>LANJUT</b> di bawah.

<b>🙏 Terima kasih dan selamat menggunakan.</b>
</blockquote>
`;

    const options = {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "𝙋𝘼𝙃𝘼𝙈, 𝙇𝘼𝙉𝙅𝙐𝙏𝙆𝘼𝙉!",
                        callback_data: "welcome_continue"
                    }
                ]
            ]
        }
    };

    if (bot) {
        await sendNewMessageWithCleanup(bot, chatId, content, options, null, false);
    } else {
        await sendNewMessage(chatId, content, options);
    }
};

// ==========================================
// 🔥 HANDLE WELCOME CONTINUE
// ==========================================

const handleWelcomeContinue = async (q, bot, sendNewMessage, users, isAuthorizedUser) => {
    const chatId = q.message.chat.id;
    
    // 🔥 PASTIKAN USER TETAP TERSIMPAN
    markWelcomeSeen(chatId);
    
    // HAPUS PESAN WELCOME
    try {
        await bot.deleteMessage(chatId, q.message.message_id);
    } catch (e) {}
    
    // HAPUS REPLY KEYBOARD
    await removeReplyKeyboard(bot, chatId);
    
    // TAMPILKAN MENU UTAMA
    await showMenu(chatId, isAuthorizedUser, users, sendNewMessage, bot);
    return true;
};

// ==========================================
// 🔥 FUNGSI SYNC KE WA-BOT
// ==========================================

async function syncToWABot(chatId) {
  try {
    console.log(`📤 [SYNC] Mengirim data user ${chatId} ke WA-Bot...`);
    
    const sewaFile = path.join(__dirname, 'sewa_aktif.json');
    let sewa = {};
    if (fs.existsSync(sewaFile)) {
      try { sewa = JSON.parse(fs.readFileSync(sewaFile)); } catch (e) {}
    }
    
    if (!sewa[chatId]) {
      console.log(`⚠️ [SYNC] User ${chatId} tidak ditemukan`);
      return false;
    }
    
    try {
      await axios.post(`${BRIDGE_URL}/add-daerah`, {
        chatId: chatId.toString(),
        kabupaten: sewa[chatId].daerah?.slice(-1)[0]?.split(' > ')[0] || '',
        kecamatan: sewa[chatId].daerah?.slice(-1)[0]?.split(' > ')[1] || '',
        kelurahan: sewa[chatId].daerah?.slice(-1)[0]?.split(' > ')[2] || ''
      }, { timeout: 5000 });
      console.log(`✅ [SYNC] Terkirim ke Bridge untuk ${chatId}`);
    } catch (e) {
      console.log(`⚠️ [SYNC] Bridge tidak merespon:`, e.message);
    }
    
    try {
      await axios.post(`${WA_API_URL}/api/sync-sewa-data`, {
        sewaData: sewa,
        timestamp: Date.now()
      }, { timeout: 3000 });
      console.log(`✅ [SYNC] Terkirim ke API WA-Bot`);
    } catch (e) {
      console.log(`⚠️ [SYNC] API WA-Bot tidak merespon:`, e.message);
    }
    
    try {
      await axios.post(`${BRIDGE_URL}/force-sync`, {}, { timeout: 5000 });
      console.log(`✅ [SYNC] Force sync berhasil`);
    } catch (e) {
      console.log(`⚠️ [SYNC] Force sync gagal:`, e.message);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ [SYNC] Error:`, error.message);
    return false;
  }
}

// ==========================================
// 🔥 FUNGSI SYNC MASSAL KE WA-BOT
// ==========================================

async function syncAllToWABot() {
  try {
    console.log(`📤 [SYNC MASSAL] Mengirim semua data ke WA-Bot...`);
    
    const sewaFile = path.join(__dirname, 'sewa_aktif.json');
    let sewa = {};
    if (fs.existsSync(sewaFile)) {
      try { sewa = JSON.parse(fs.readFileSync(sewaFile)); } catch (e) {}
    }
    
    try {
      await axios.post(`${BRIDGE_URL}/sync-all-to-wabot`, {
        sewaData: sewa,
        daerahData: {},
        timestamp: Date.now()
      }, { timeout: 10000 });
      console.log(`✅ [SYNC MASSAL] Terkirim ke Bridge`);
    } catch (e) {
      console.log(`⚠️ [SYNC MASSAL] Bridge tidak merespon:`, e.message);
    }
    
    try {
      await axios.post(`${WA_API_URL}/api/sync-sewa-data`, {
        sewaData: sewa,
        timestamp: Date.now()
      }, { timeout: 5000 });
      console.log(`✅ [SYNC MASSAL] Terkirim ke API WA-Bot`);
    } catch (e) {
      console.log(`⚠️ [SYNC MASSAL] API WA-Bot tidak merespon:`, e.message);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ [SYNC MASSAL] Error:`, error.message);
    return false;
  }
}

// ==========================================
// 🔥 MENU SEWA BOT (LANGSUNG QRIS)
// ==========================================

const showSewaMenu = async (chatId, sendNewMessage, bot = null) => {
  // 🔥 HAPUS REPLY KEYBOARD SEBELUM MENU SEWA
  if (bot) {
    await removeReplyKeyboard(bot, chatId);
  }
  return sewaBot.showSewaBotMenu(chatId, sendNewMessage, bot);
};

// ==========================================
// 🔥 MENU PROFIL (CEK SEWA DENGAN TANGGAL + DAERAH + HAPUS)
// ==========================================

const showProfilMenu = async (chatId, sendNewMessage, bot = null) => {
  // 🔥 HAPUS REPLY KEYBOARD SEBELUM MENU PROFIL
  if (bot) {
    await removeReplyKeyboard(bot, chatId);
  }

  const sewa = sewaBot.getSewa(chatId);

  let sewaText = '❌ Belum sewa';
  let statusText = 'Tidak aktif';
  let detailText = '';
  let daerahText = '❌ Belum ada daerah';
  let daerahList = [];

  if (sewa && sewa.active) {
    const now = Date.now();

    if (now < sewa.expired) {
      const sisaHari = Math.ceil(
        (sewa.expired - now) / (1000 * 60 * 60 * 24)
      );

      const sisaJam = Math.floor(
        ((sewa.expired - now) / (1000 * 60 * 60)) % 24
      );

      sewaText = `✅ ${sewa.duration}`;
      statusText = `Aktif (${sisaHari} hari ${sisaJam} jam)`;

      detailText = `
📅 <b>Mulai:</b> ${sewa.start_date || '-'}
📅 <b>Berakhir:</b> ${sewa.expired_date || '-'}
⏳ <b>Sisa:</b> ${sisaHari} hari ${sisaJam} jam`;

      if (sewa.daerah && sewa.daerah.length > 0) {
        daerahList = sewa.daerah;
        daerahText = sewa.daerah
          .map((d, i) => `  ${i + 1}. ${d}`)
          .join('\n');
      } else {
        daerahText = `❌ Belum ada daerah
📌 Gunakan /tambah untuk menambah`;
      }
    } else {
      sewaText = `⏰ ${sewa.duration}`;
      statusText = 'Expired';

      detailText = `
📅 <b>Mulai:</b> ${sewa.start_date || '-'}
📅 <b>Berakhir:</b> ${sewa.expired_date || '-'}
⏰ <b>Status:</b> Sudah expired`;
    }
  }

  // 🔥 BUILD INLINE KEYBOARD
  let inlineKeyboard = [
    [
      {
        text: "📍𝐓𝐚𝐦𝐛𝐚𝐡 𝐋𝐚𝐠𝐢",
        callback_data: "tambah_daerah"
      }
    ],
    [
      {
        text: "⏳𝐂𝐞𝐤 𝐒𝐞𝐰𝐚",
        callback_data: "cek_sewa"
      },
      {
        text: "🤖𝐏𝐞𝐫𝐩𝐚𝐧𝐣𝐚𝐧𝐠",
        callback_data: "sewa_menu"
      }
    ]
  ];

  // 🔥 TAMBAHKAN TOMBOL HAPUS DAERAH JIKA ADA DAERAH
  if (daerahList.length > 0) {
    inlineKeyboard.push([
      {
        text: "🗑️ 𝐇𝐚𝐩𝐮𝐬 𝐃𝐚𝐞𝐫𝐚𝐡",
        callback_data: "hapus_daerah"
      }
    ]);
  }

  inlineKeyboard.push([
    {
      text: "🔙𝐁𝐚𝐥𝐢𝐤 𝐮𝐧𝐭𝐮𝐤",
      callback_data: "back_to_main"
    }
  ]);

  const content = `
<blockquote>
📊 <b>PROFIL USER</b>

👤 <b>ID:</b> ${chatId}
🤖 <b>Sewa:</b> ${sewaText}
📅 <b>Status:</b> ${statusText}
${detailText}

📍 <b>Daerah Terdaftar:</b>
${daerahText}
</blockquote>
`;

  const options = {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  };

  if (bot) {
    await sendNewMessageWithCleanup(
      bot,
      chatId,
      content,
      options,
      null,
      false
    );
  } else {
    await sendNewMessage(chatId, content, options);
  }
};

// ==========================================
// 🔥 MENU TAMBAH DAERAH (CEK SEWA DARI WA-BOT)
// ==========================================

const showTambahDaerahMenu = async (chatId, sendNewMessage, bot = null) => {
  // 🔥 HAPUS REPLY KEYBOARD SEBELUM MENU TAMBAH DAERAH
  if (bot) {
    await removeReplyKeyboard(bot, chatId);
  }

  const sewaFile = path.join(__dirname, 'wa-bot', 'sewa_aktif.json');
  let sewaData = {};
  let sewa = null;

  if (fs.existsSync(sewaFile)) {
    try {
      sewaData = JSON.parse(fs.readFileSync(sewaFile, 'utf8'));
      sewa = sewaData[chatId];
      console.log(`[TAMBAH MENU] 📊 Cek sewa user ${chatId} dari wa-bot`);
    } catch (e) {
      console.log(
        `[TAMBAH MENU] ❌ Error baca sewa_aktif.json:`,
        e.message
      );
    }
  } else {
    console.log(
      `[TAMBAH MENU] ⚠️ File wa-bot/sewa_aktif.json tidak ditemukan`
    );
  }

  const now = Date.now();
  const expired =
    sewa?.expired === 'Forever' ? Infinity : sewa?.expired;

  const isActive =
    sewa?.active &&
    (expired === Infinity || expired > now);

  // ==========================================
  // ❌ BELUM ADA SEWA
  // ==========================================
  if (!sewa || !isActive) {
    const content = `
<blockquote>
❌ <b>Belum ada sewa aktif!</b>

Silahkan sewa bot terlebih dahulu:

📌 <b>Paket Sewa:</b>
├ 1 Minggu : Rp 1 (TEST)
├ 1 Bulan  : Rp 100.000
└ 1 Tahun  : Rp 500.000
</blockquote>
`;

    const options = {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🤖𝐒𝐞𝐰𝐚 𝐁𝐨𝐭",
              callback_data: "sewa_menu"
            }
          ],
          [
            {
              text: "🔙𝐁𝐚𝐥𝐢𝐤 𝐊𝐚𝐧𝐚𝐧",
              callback_data: "back_to_main"
            }
          ]
        ]
      }
    };

    if (bot) {
      await sendNewMessageWithCleanup(
        bot,
        chatId,
        content,
        options,
        null,
        false
      );
    } else {
      await sendNewMessage(chatId, content, options);
    }

    return;
  }

  // ==========================================
  // ⏰ SEWA EXPIRED
  // ==========================================
  if (expired !== Infinity && now >= expired) {
    const content = `
<blockquote>
⏰ <b>Sewa sudah EXPIRED!</b>

Silahkan perpanjang sewa:

📅 <b>Berakhir:</b> ${sewa.expired_date || '-'}
📦 <b>Paket:</b> ${sewa.duration || '-'}
</blockquote>
`;

    const options = {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🤖𝐒𝐞𝐰𝐚 𝐁𝐨𝐭",
              callback_data: "sewa_menu"
            }
          ],
          [
            {
              text: "🔙𝐁𝐚𝐥𝐢𝐤 𝐊𝐚𝐧𝐚𝐧",
              callback_data: "back_to_main"
            }
          ]
        ]
      }
    };

    if (bot) {
      await sendNewMessageWithCleanup(
        bot,
        chatId,
        content,
        options,
        null,
        false
      );
    } else {
      await sendNewMessage(chatId, content, options);
    }

    return;
  }

  // ==========================================
  // 📍 DAERAH TERDAFTAR
  // ==========================================
  let daerahList = '❌ Belum ada daerah terdaftar';

  if (sewa.daerah && sewa.daerah.length > 0) {
    daerahList = sewa.daerah
      .map((d, i) => `  ${i + 1}. ${d}`)
      .join('\n');
  }

  const sisaHari =
    expired === Infinity
      ? '∞'
      : Math.ceil(
          (expired - now) / (1000 * 60 * 60 * 24)
        );

  const content = `
<blockquote>
📍 <b>TAMBAH DAERAH</b>

📌 <b>Kirim pesan dengan format:</b>

<code>/tambah KABUPATEN KECAMATAN KELURAHAN</code>
atau
<code>/tambah KABUPATEN &gt; KECAMATAN &gt; KELURAHAN</code>

📝 <b>Contoh:</b>
<code>/tambah SERANG CIKEUSIK CINANGKA</code>

📍 <b>Daerah Terdaftar Saat Ini:</b>
${daerahList}

📊 <b>Sisa Sewa:</b> ${sisaHari} ${sisaHari === '∞' ? '' : 'hari lagi'}
📦 <b>Paket:</b> ${sewa.duration || '-'}

✅ Pastikan format benar
(gunakan spasi atau &gt; sebagai pemisah)
</blockquote>
`;

  // ==========================================
  // 🔘 BUTTON
  // ==========================================
  const options = {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📋𝐂𝐨𝐧𝐭𝐨𝐡 𝐅𝐨𝐫𝐦𝐚𝐭",
            callback_data: "contoh_format_daerah"
          }
        ],
        [
          {
            text: "📊𝐂𝐞𝐤 𝐒𝐞𝐰𝐚",
            callback_data: "cek_sewa"
          },
          {
            text: "🔙𝐁𝐚𝐥𝐢𝐤 𝐊𝐚𝐧𝐚𝐧",
            callback_data: "back_to_main"
          }
        ]
      ]
    }
  };

  if (bot) {
    await sendNewMessageWithCleanup(
      bot,
      chatId,
      content,
      options,
      null,
      false
    );
  } else {
    await sendNewMessage(chatId, content, options);
  }
};

// ==========================================
// 🔥 MAIN MENU (TANPA SAVE DATA) - PAKE IMAGE
// ==========================================

const showMenu = async (chatId, isAuthorizedUser, users, sendNewMessage, bot = null) => {
  // 🔥 HAPUS REPLY KEYBOARD SEBELUM MENU UTAMA
  if (bot) {
    await removeReplyKeyboard(bot, chatId);
  }
  
  const baseUser = 1000;
  const totalUser = baseUser + Object.keys(users || {}).length;

  const sewa = sewaBot.getSewa(chatId);
  let sewaStatus = '❌ Belum sewa';
  let sewaDetail = '';
  let daerahCount = 0;

  // 🔥🔥🔥 CEK AUTHORIZED! 🔥🔥🔥
  if (isAuthorizedUser) {
    sewaStatus = 'Unlimted';
    sewaDetail = '✅ Akses penuh';
  } else {
    // 🔥 CEK SEWA USER BIASA
    if (sewa && sewa.active) {
      const now = Date.now();
      if (now < sewa.expired) {
        const sisaHari = Math.ceil((sewa.expired - now) / (1000 * 60 * 60 * 24));
        sewaStatus = `✅ ${sewa.duration}`;
        sewaDetail = `⏳ Sisa ${sisaHari} hari`;
        if (sewa.daerah) daerahCount = sewa.daerah.length;
      } else {
        sewaStatus = '⏰ Expired';
        sewaDetail = '⏳ Silahkan perpanjang';
      }
    }
  }

  // 🔥 AMBIL USERNAME DARI DATA USER
  let username = chatId;
  if (users && users[chatId]) {
    username = users[chatId].username || users[chatId].first_name || chatId;
  }

  // ==========================================
  // 🔘 BUTTON MENU
  // ==========================================

  const buttons = [];

  // Baris 1 — PROFIL
  buttons.push([
    {
      text: "☤⊶ 𝐏𝐫𝐨𝐟𝐢𝐥 ⊷☤",
      callback_data: "profil_menu"
    }
  ]);

  // Baris 2 — TAMBAH DAERAH + SEWA BOT
  buttons.push([
    {
      text: "📥𝐒𝐚𝐯𝐞 𝐃𝐚𝐞𝐫𝐚𝐡",
      callback_data: "tambah_daerah"
    },
    {
      text: "🤖𝐒𝐞𝐰𝐚 𝐁𝐨𝐭",
      callback_data: "sewa_menu"
    }
  ]);

  // Baris 3 — REFRESH
  buttons.push([
    {
      text: "♲ 𝐑𝐞𝐟𝐫𝐞𝐬𝐡 ♲",
      callback_data: "back_to_main"
    }
  ]);

  // ==========================================
  // 👑 MENU OWNER/ADMIN
  // ==========================================

  if (isAuthorizedUser) {
    buttons.push([
      {
        text: "⚙️𝐒𝐞𝐭𝐭𝐢𝐧𝐠",
        callback_data: "admin_menu"
      },
      {
        text: "🤖𝐌𝐞𝐧𝐮 𝐖𝐀",
        callback_data: "whatsapp_menu"
      }
    ]);
  }

  // ==========================================
  // 📝 CAPTION
  // ==========================================

const caption = `
◉ |  S U N G  J I N - W O O _ B O T
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⩥
┏┅➤  U S E R   I N F O
┋
┋  〄 Username  : @${username} ${isAuthorizedUser ? '👑' : ''}
┋  〄 User ID   : ${chatId}
┋  〄 Total User : ${totalUser}
┋  〄 Status Bot : ACTIVE
┋  〄 Status Sewa: ${sewaStatus}
┋  〄 Sisa Waktu : ${sewaDetail}
┋  〄 Daerah     : ${daerahCount}
┋
┗┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅⚼

◉  2026 - 2027 | All Rights Reserved
`;

  // ==========================================
  // 📤 KIRIM MENU - PAKE IMAGE
  // ==========================================

  if (bot) {
    await sendNewMessageWithCleanup(
      bot,
      chatId,
      caption,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: buttons
        }
      },
      null,
      true
    );
  } else {
    await sendNewMessage(
      chatId,
      caption,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: buttons
        }
      }
    );
  }
};

// ==========================================
// 🔥 WHATSAPP MENU
// ==========================================

const showWhatsAppMenu = async (chatId, sendNewMessage, bot = null) => {
  // 🔥 HAPUS REPLY KEYBOARD SEBELUM MENU WA
  if (bot) {
    await removeReplyKeyboard(bot, chatId);
  }
  return waMenu.showWhatsAppMenu(chatId, sendNewMessage, bot, null);
};

const showPairingMenu = async (chatId, sendNewMessage, bot = null) => {
  // 🔥 HAPUS REPLY KEYBOARD SEBELUM MENU PAIRING
  if (bot) {
    await removeReplyKeyboard(bot, chatId);
  }
  return waMenu.showPairingMenu(chatId, sendNewMessage, bot, sendNewMessageWithCleanup);
};

const showBroadcastWAMenu = async (chatId, sendNewMessage, bot = null) => {
  // 🔥 HAPUS REPLY KEYBOARD SEBELUM MENU BROADCAST
  if (bot) {
    await removeReplyKeyboard(bot, chatId);
  }
  return waMenu.showBroadcastWAMenu(chatId, sendNewMessage, bot, sendNewMessageWithCleanup);
};

// ==========================================
// 🔥 HANDLE TAMBAH DAERAH
// ==========================================

const handleTambahDaerah = async (chatId, text, bot, sendMessage) => {
  try {
    let kabupaten, kecamatan, kelurahan;
    
    let cleanText = text.replace(/^\/tambah\s+/i, '').trim();
    
    console.log(`[TAMBAH] Clean text: ${cleanText}`);
    
    let match = cleanText.match(/^(.+?)\s*>\s*(.+?)\s*>\s*(.+)$/i);
    
    if (match) {
      kabupaten = match[1].trim().toUpperCase();
      kecamatan = match[2].trim().toUpperCase();
      kelurahan = match[3].trim().toUpperCase();
      console.log(`[TAMBAH] Format >: ${kabupaten} > ${kecamatan} > ${kelurahan}`);
    } else {
      const parts = cleanText.split(/\s+/);
      
      console.log(`[TAMBAH] Parts: ${parts.length} - ${parts.join(', ')}`);
      
      if (parts.length < 3) {
        return sendMessage(chatId, 
          `❌ *Format salah!*\n\n` +
          `📌 *Cara penggunaan:*\n` +
          `/tambah KABUPATEN KECAMATAN KELURAHAN\n\n` +
          `📝 *Contoh:*\n` +
          `/tambah SERANG CIKEUSIK CINANGKA\n\n` +
          `Atau dengan tanda >\n` +
          `/tambah SERANG > CIKEUSIK > CINANGKA`,
          { parse_mode: 'Markdown' }
        );
      }
      
      if (parts.length === 3) {
        kabupaten = parts[0].toUpperCase();
        kecamatan = parts[1].toUpperCase();
        kelurahan = parts[2].toUpperCase();
      } else if (parts.length > 3) {
        kelurahan = parts[parts.length - 1].toUpperCase();
        kecamatan = parts[parts.length - 2].toUpperCase();
        kabupaten = parts.slice(0, parts.length - 2).join(' ').toUpperCase();
      }
      
      console.log(`[TAMBAH] Format spasi: ${kabupaten} > ${kecamatan} > ${kelurahan}`);
    }
    
    if (!kabupaten || !kecamatan || !kelurahan) {
      return sendMessage(chatId, 
        `❌ *Format tidak valid!*\n\n` +
        `📌 Gunakan:\n` +
        `/tambah KABUPATEN KECAMATAN KELURAHAN\n\n` +
        `📝 Contoh:\n` +
        `/tambah SERANG CIKEUSIK CINANGKA`,
        { parse_mode: 'Markdown' }
      );
    }
    
    if (kabupaten.length < 2 || kecamatan.length < 2 || kelurahan.length < 2) {
      return sendMessage(chatId, 
        `❌ *Nama daerah terlalu pendek!*\n\n` +
        `Pastikan semua nama minimal 2 huruf.`,
        { parse_mode: 'Markdown' }
      );
    }
    
    const daerah = `${kabupaten} > ${kecamatan} > ${kelurahan}`;
    
    const sewaFile = path.join(__dirname, 'wa-bot', 'sewa_aktif.json');
    let sewaData = {};
    if (fs.existsSync(sewaFile)) {
      try {
        sewaData = JSON.parse(fs.readFileSync(sewaFile, 'utf8'));
      } catch (e) {
        console.log(`[TAMBAH] ❌ Error baca sewa_aktif.json:`, e.message);
      }
    }
    
    const userSewa = sewaData[chatId];
    
    if (!userSewa) {
      return sendMessage(chatId, 
        `❌ *Anda belum memiliki sewa aktif di WA-Bot!*\n\n` +
        `📌 Silahkan sewa terlebih dahulu:\n` +
        `/sewa\n\n` +
        `📌 Atau hubungi Admin untuk bantuan.`,
        { parse_mode: 'Markdown' }
      );
    }
    
    const now = Date.now();
    const expired = userSewa.expired === 'Forever' ? Infinity : userSewa.expired;
    const isActive = userSewa.active && (expired === Infinity || expired > now);
    
    if (!isActive) {
      return sendMessage(chatId, 
        `⏰ *Sewa Anda telah EXPIRED!*\n\n` +
        `📦 Paket: ${userSewa.duration || '-'}\n` +
        `📅 Berakhir: ${userSewa.expired_date || '-'}\n\n` +
        `📌 Silahkan perpanjang sewa:\n` +
        `/sewa\n\n` +
        `📌 Atau hubungi Admin untuk bantuan.`,
        { parse_mode: 'Markdown' }
      );
    }
    
    if (userSewa.daerah && userSewa.daerah.includes(daerah)) {
      return sendMessage(chatId, 
        `⚠️ *Daerah sudah terdaftar!*\n\n📍 ${daerah}`,
        { parse_mode: 'Markdown' }
      );
    }
    
    if (!userSewa.daerah) userSewa.daerah = [];
    userSewa.daerah.push(daerah);
    userSewa.active = true;
    
    fs.writeFileSync(sewaFile, JSON.stringify(sewaData, null, 2));
    console.log(`✅ [DAERAH] Ditambahkan untuk ${chatId}: ${daerah}`);
    console.log(`📊 [DAERAH] Total: ${userSewa.daerah.length} daerah`);
    
    await sendMessage(chatId, 
      `⏳ *Menyinkronkan ke WA-Bot...*`,
      { parse_mode: 'Markdown' }
    );
    
    try {
      await axios.post(`${BRIDGE_URL}/add-daerah`, {
        chatId: chatId.toString(),
        kabupaten: kabupaten,
        kecamatan: kecamatan,
        kelurahan: kelurahan
      }, { timeout: 5000 });
      console.log(`✅ [SYNC] Terkirim ke Bridge`);
    } catch (e) {
      console.log(`⚠️ [SYNC] Bridge tidak merespon:`, e.message);
    }
    
    try {
      await axios.post(`${WA_API_URL}/api/sync-sewa-data`, {
        sewaData: sewaData,
        timestamp: Date.now()
      }, { timeout: 3000 });
      console.log(`✅ [SYNC] Terkirim ke API WA-Bot`);
    } catch (e) {
      console.log(`⚠️ [SYNC] API WA-Bot tidak merespon:`, e.message);
    }
    
    try {
      await axios.post(`${BRIDGE_URL}/force-sync`, {}, { timeout: 5000 });
      console.log(`✅ [SYNC] Force sync berhasil`);
    } catch (e) {
      console.log(`⚠️ [SYNC] Force sync gagal:`, e.message);
    }
    
    const response = 
      `✅ *Berhasil Ditambahkan!*\n\n` +
      `📍 ${kabupaten} > ${kecamatan} > ${kelurahan}\n` +
      `📋 Total daerah: ${userSewa.daerah.length}\n\n` +
      `📌 Data telah disinkronkan ke WA-Bot!\n` +
      `WA-Bot akan mendeteksi data dari grup untuk daerah ini.\n\n` +
      `📝 *Contoh format lain:*\n` +
      `/tambah KABUPATEN KECAMATAN KELURAHAN\n` +
      `atau\n` +
      `/tambah KABUPATEN > KECAMATAN > KELURAHAN`;
    
    await sendMessage(chatId, response, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.log('[HANDLE TAMBAH] Error:', error.message);
    await sendMessage(chatId, 
      `❌ *Error:* ${error.message}\n\n` +
      `📌 Gunakan format:\n` +
      `/tambah KABUPATEN KECAMATAN KELURAHAN\n\n` +
      `📝 Contoh:\n` +
      `/tambah SERANG CIKEUSIK CINANGKA`,
      { parse_mode: 'Markdown' }
    );
  }
};

// ==========================================
// 🔥 COMMAND SYNC MANUAL (UNTUK OWNER/ADMIN)
// ==========================================

const handleSyncCommand = async (chatId, bot, sendMessage) => {
  try {
    await sendMessage(chatId, `🔄 *Sync ke WA-Bot dimulai...*`, { parse_mode: 'Markdown' });
    
    const result = await syncAllToWABot();
    
    if (result) {
      await sendMessage(chatId, 
        `✅ *Sync Berhasil!*\n\n` +
        `📊 Data telah disinkronkan ke WA-Bot\n` +
        `🕐 ${new Date().toLocaleString('id-ID')}`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await sendMessage(chatId, 
        `❌ *Sync Gagal!*\n\n` +
        `Coba lagi atau cek koneksi ke Bridge/WA-Bot.`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    console.log('[SYNC COMMAND] Error:', error.message);
    await sendMessage(chatId, `❌ Error: ${error.message}`, { parse_mode: 'Markdown' });
  }
};

// ==========================================
// 🔥 HANDLE CALLBACK (TAMBAHAN UNTUK BACK TO MAIN)
// ==========================================

const handleMenuCallback = async (q, bot, sendNewMessage) => {
  const chatId = q.message.chat.id;
  const data = q.data;
  
  if (data === 'back_to_main' || data === 'back_to_menu') {
    // 🔥 HAPUS REPLY KEYBOARD
    await removeReplyKeyboard(bot, chatId);
    
    // HAPUS PESAN SEBELUMNYA
    try {
      await bot.deleteMessage(chatId, q.message.message_id);
    } catch (e) {}
    
    // TAMPILKAN MENU UTAMA
    const users = {}; // Ambil dari global atau state
    const isAuthorizedUser = false; // Cek authorized
    await showMenu(chatId, isAuthorizedUser, users, sendNewMessage, bot);
    return true;
  }
  
  return false;
};

// ==========================================
// 🔥 SESSION TAMBAH DAERAH STEP BY STEP
// ==========================================

const tambahDaerahSession = {};

// ==========================================
// 🔥 START TAMBAH DAERAH - STEP 1 (KABUPATEN)
// ==========================================

const startTambahDaerah = async (chatId, bot, sendMessage) => {
    let sewaFile = '/root/wabot/data/sewa_aktif.json';
    let sewaData = {};
    let userSewa = null;  // 🔥 WAJIB DEKLARASI!
    
    // 🔥 BACA DARI WA-BOT
    if (fs.existsSync(sewaFile)) {
        try {
            sewaData = JSON.parse(fs.readFileSync(sewaFile, 'utf8'));
            userSewa = sewaData[chatId];
        } catch (e) {}
    }
    
    // 🔥 FALLBACK: CEK LOKAL
    if (!userSewa || !userSewa.active) {
        const localFile = path.join(__dirname, 'sewa_aktif.json');
        if (fs.existsSync(localFile)) {
            try {
                const localData = JSON.parse(fs.readFileSync(localFile, 'utf8'));
                if (localData[chatId] && localData[chatId].active) {
                    userSewa = localData[chatId];
                    sewaData[chatId] = userSewa;
                    fs.writeFileSync(sewaFile, JSON.stringify(sewaData, null, 2));
                    console.log(`[TAMBAH] ✅ Sync ke WA-BOT: ${chatId}`);
                }
            } catch (e) {}
        }
    }
    
    if (!userSewa || !userSewa.active) {
        return sendMessage(chatId, 
            `<blockquote>❌ Belum ada sewa aktif!

📌 /sewa untuk mulai.</blockquote>`,
            { parse_mode: 'HTML' }
        );
    }
    
    // 🔥 CEK EXPIRED
    const now = Date.now();
    const expired = userSewa.expired === 'Forever' ? Infinity : userSewa.expired;
    if (expired !== Infinity && now >= expired) {
        return sendMessage(chatId, 
            `<blockquote>⏰ Sewa sudah EXPIRED!

📌 /sewa untuk perpanjang.</blockquote>`,
            { parse_mode: 'HTML' }
        );
    }
    
    // 🔥 RESET SESSION
    tambahDaerahSession[chatId] = {
        step: 'kabupaten',
        kabupaten: null,
        kecamatan: null,
        kelurahan: null
    };
    
    const msg = `<blockquote>📍 TAMBAH DAERAH (1/3)

📌 Masukkan KABUPATEN/KOTA:
📝 Contoh: TANGGERANG

⏹️ Ketik batal untuk batal.</blockquote>`;
    
    await sendMessage(chatId, msg, { parse_mode: 'HTML' });
};

// ==========================================
// 🔥 HANDLE INPUT TAMBAH DAERAH STEP BY STEP
// ==========================================

const handleTambahDaerahStep = async (chatId, text, bot, sendMessage) => {
    const session = tambahDaerahSession[chatId];
    
    if (!session) return false;
    
    // 🔥 BATAL
    if (text.toLowerCase() === 'batal') {
        delete tambahDaerahSession[chatId];
        await sendMessage(chatId, `<blockquote>✅ Dibatalkan.</blockquote>`, { parse_mode: 'HTML' });
        return true;
    }
    
    const cleanText = text.trim().toUpperCase();
    if (cleanText.length < 2) {
        await sendMessage(chatId, `<blockquote>❌ Minimal 2 huruf. Coba lagi.</blockquote>`, { parse_mode: 'HTML' });
        return true;
    }
    
    // 🔥 STEP 1: KABUPATEN
    if (session.step === 'kabupaten') {
        session.kabupaten = cleanText;
        session.step = 'kecamatan';
        
        await sendMessage(chatId, 
            `<blockquote>✅ Kabupaten: ${cleanText}

📍 TAMBAH DAERAH (2/3)
📌 Masukkan KECAMATAN:
📝 Contoh: KEJANG

⏹️ Ketik batal untuk batal.</blockquote>`,
            { parse_mode: 'HTML' }
        );
        return true;
    }
    
    // 🔥 STEP 2: KECAMATAN
    if (session.step === 'kecamatan') {
        session.kecamatan = cleanText;
        session.step = 'kelurahan';
        
        await sendMessage(chatId, 
            `<blockquote>✅ Kab: ${session.kabupaten}
✅ Kec: ${cleanText}

📍 TAMBAH DAERAH (3/3)
📌 Masukkan KELURAHAN/DESA:
📝 Contoh: KAMPANYE

⏹️ Ketik batal untuk batal.</blockquote>`,
            { parse_mode: 'HTML' }
        );
        return true;
    }
    
    // 🔥 STEP 3: KELURAHAN - SAVE!
    if (session.step === 'kelurahan') {
        session.kelurahan = cleanText;
        
        const kabupaten = session.kabupaten;
        const kecamatan = session.kecamatan;
        const kelurahan = cleanText;
        const daerah = `${kabupaten} > ${kecamatan} > ${kelurahan}`;
        
        const sewaFile = '/root/wabot/data/sewa_aktif.json';
        let sewaData = {};
        if (fs.existsSync(sewaFile)) {
            try {
                sewaData = JSON.parse(fs.readFileSync(sewaFile, 'utf8'));
            } catch (e) {}
        }
        
        if (!sewaData[chatId]) {
            delete tambahDaerahSession[chatId];
            return sendMessage(chatId, `<blockquote>❌ Data sewa tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
        }
        
        if (!sewaData[chatId].daerah) sewaData[chatId].daerah = [];
        
        if (sewaData[chatId].daerah.includes(daerah)) {
            delete tambahDaerahSession[chatId];
            return sendMessage(chatId, `<blockquote>⚠️ Daerah sudah terdaftar!

📍 ${daerah}</blockquote>`, { parse_mode: 'HTML' });
        }
        
        sewaData[chatId].daerah.push(daerah);
        sewaData[chatId].active = true;
        fs.writeFileSync(sewaFile, JSON.stringify(sewaData, null, 2));
        
        // 🔥 SYNC
        try {
            await axios.post('http://127.0.0.1:3005/api/sync-sewa-data', {
                sewaData: sewaData,
                timestamp: Date.now()
            }, { timeout: 5000 });
        } catch (e) {}
        
        try {
            await axios.post('http://localhost:3004/sync-all-to-wabot', {
                sewaData: sewaData,
                daerahData: {},
                timestamp: Date.now()
            }, { timeout: 5000 });
        } catch (e) {}
        
        delete tambahDaerahSession[chatId];
        
        // 🔥 KIRIM KONFIRMASI + BUTTON BACK TO MENU
        const msg = `<blockquote>✅ DAERAH BERHASIL DITAMBAHKAN!

📍 ${kabupaten} > ${kecamatan} > ${kelurahan}
📋 Total: ${sewaData[chatId].daerah.length} daerah

📌 Data Ter save di database.</blockquote>`;
        
        // 🔥 BUTTON KEMBALI KE MENU
        const options = {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 KEMBALI KE MENU", callback_data: "back_to_main" }]
                ]
            }
        };
        
        await sendMessage(chatId, msg, options);
        return true;
    }
    
    return false;
};

// ==========================================
// 🔥 EXPORT
// ==========================================
module.exports = {
    showMenu,
    showSewaMenu,   
    showProfilMenu,
    showTambahDaerahMenu, 
    handleTambahDaerah,
    handleSyncCommand,
    syncToWABot,
    syncAllToWABot,
    showWhatsAppMenu,
    showPairingMenu,
    showBroadcastWAMenu,
    deletePreviousMessage,
    sendNewMessageWithCleanup,
    sendImageWithCleanup,
    lastMessages,
    IMAGE_URL,
    removeReplyKeyboard,
    handleMenuCallback,
    deleteAllMessages,
    showWelcomeScreen,
    hasSeenWelcome,
    handleWelcomeContinue,
    markWelcomeSeen,
    startTambahDaerah,
    handleTambahDaerahStep,
    tambahDaerahSession
};