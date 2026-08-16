const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

let sock = null;
let contacts = {};
let settings = {};
const START_TIME = Math.floor(Date.now() / 1000);

function setSock(waSock) { sock = waSock; }
function setContacts(waContacts) { contacts = waContacts; }
function setSettings(waSettings) { settings = waSettings; }

async function sendToTelegram(message, from, isOwner = false) {
  try {
    await axios.post('http://localhost:3004/wa-to-telegram', {
      message: message,
      from: from || 'WhatsApp',
      isOwner: isOwner
    });
  } catch (error) {
    console.log('[TELEGRAM ERR]', error.message);
  }
}

// API Endpoints
app.post('/telegram-to-wa', async (req, res) => {
  try {
    const { to, message, from } = req.body;
    if (!sock) return res.status(500).json({ error: 'WA bot not connected' });
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: `📨 ${from || 'Telegram'}: ${message}` });
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/status', (req, res) => {
  res.json({
    connected: sock ? true : false,
    phone: sock?.user?.id || null,
    contacts: Object.keys(contacts || {}).length || 0,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    botName: settings?.botName || 'KJS BOT'
  });
});

app.get('/contacts', (req, res) => {
  const list = Object.keys(contacts || {}).map(key => ({
    id: key,
    name: contacts[key]?.name || contacts[key]?.pushname || key
  }));
  res.json({ contacts: list });
});

app.post('/broadcast-wa', async (req, res) => {
  try {
    const { message, from } = req.body;
    if (!sock) return res.status(500).json({ error: 'WA bot not connected' });
    const list = Object.keys(contacts || {}).filter(j => j.endsWith('@s.whatsapp.net'));
    let sent = 0, failed = 0;
    for (const contact of list) {
      try {
        await sock.sendMessage(contact, { text: `📢 BROADCAST\n\n${message}\n\n- Dari ${from || 'System'}` });
        sent++;
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) { failed++; }
    }
    res.json({ sent, failed, total: list.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== PAIRING ENDPOINT =====
app.post('/pair-wa', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Phone number required' });
    
    console.log(`[PAIR] Request for ${phoneNumber}`);
    
    if (!sock) {
      return res.status(500).json({ error: 'WA bot not connected, please wait...' });
    }
    
    try {
      const code = await sock.requestPairingCode(phoneNumber);
      console.log(`[PAIR] Code: ${code}`);
      
      await sendToTelegram(`📱 *Kode Pairing WhatsApp*\n\nKode: ${code}\n\nMasukkan kode ini di WhatsApp untuk menghubungkan bot.`, 'System');
      
      res.json({
        status: 'success',
        message: 'Pairing code generated',
        phoneNumber: phoneNumber,
        code: code
      });
    } catch (pairError) {
      console.log('[PAIR] Error:', pairError.message);
      res.status(500).json({ error: 'Failed: ' + pairError.message });
    }
  } catch (error) {
    console.log('[PAIR] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3005;
app.listen(PORT, () => console.log(`[BRIDGE] WA Bridge running on port ${PORT}`));

module.exports = { setSock, setContacts, setSettings, sendToTelegram };