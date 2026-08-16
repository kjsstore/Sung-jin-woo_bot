#!/bin/bash

# ==========================================
# 🚀 SUNG-JIN-WOO BOT AUTO INSTALLER
# ==========================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN}   🚀 SUNG-JIN-WOO BOT INSTALLER${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# ==========================================
# 1. CEK USER
# ==========================================
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Jangan jalankan sebagai root!${NC}"
    exit 1
fi

# ==========================================
# 2. DETEKSI USERNAME
# ==========================================
USERNAME=$(whoami)
echo -e "${YELLOW}👤 User: $USERNAME${NC}"

# ==========================================
# 3. UPDATE & INSTALL DEPENDENCIES
# ==========================================
echo -e "${YELLOW}📦 Update packages...${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "${YELLOW}📦 Install dependencies...${NC}"
sudo apt install -y \
    git \
    curl \
    wget \
    nodejs \
    npm \
    build-essential \
    ffmpeg \
    imagemagick \
    neofetch

# ==========================================
# 4. INSTALL PM2
# ==========================================
echo -e "${YELLOW}📦 Install PM2...${NC}"
sudo npm install -g pm2
pm2 update

# ==========================================
# 5. CLONE REPO
# ==========================================
echo -e "${YELLOW}📁 Clone repository...${NC}"
cd ~
rm -rf ~/sung-jin-woo-bot
git clone https://github.com/kjsstore/Sung-jin-woo_bot.git ~/sung-jin-woo-bot
cd ~/sung-jin-woo-bot

# ==========================================
# 6. INSTALL TELEGRAM BOT
# ==========================================
echo -e "${YELLOW}🤖 Setup Telegram Bot...${NC}"
cd ~/sung-jin-woo-bot

# Install dependencies
npm install

# Install tambahan untuk Telegram Bot
npm install node-telegram-bot-api axios express

# ==========================================
# 7. INSTALL WHATSAPP BOT
# ==========================================
echo -e "${YELLOW}📱 Setup WhatsApp Bot...${NC}"
cd ~/sung-jin-woo-bot/wabot

# Install dependencies
npm install

# Install tambahan untuk WA Bot
npm install @whiskeysockets/baileys @hapi/boom qrcode cfonts axios express

# ==========================================
# 8. BUAT FOLDER DAN FILE KONFIGURASI
# ==========================================
echo -e "${YELLOW}⚙️ Setup konfigurasi...${NC}"

cd ~/sung-jin-woo-bot

# Buat folder sessions
mkdir -p ~/sung-jin-woo-bot/wabot/sessions

# Buat file config.js dari template
cat > config.js << 'EOF'
module.exports = {
  BOT: {
    TOKEN: "YOUR_BOT_TOKEN_HERE",
    OWNER_ID: "YOUR_TELEGRAM_ID_HERE"
  }
};
EOF

# ==========================================
# 9. BUAT PM2 ECOSYSTEM
# ==========================================
echo -e "${YELLOW}⚙️ Setup PM2...${NC}"

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'telegram-bot',
      cwd: '/home/USERNAME_PLACEHOLDER/sung-jin-woo-bot',
      script: 'index.js',
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'wabot',
      cwd: '/home/USERNAME_PLACEHOLDER/sung-jin-woo-bot/wabot',
      script: 'index.js',
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# Ganti USERNAME placeholder
sed -i "s|USERNAME_PLACEHOLDER|$USERNAME|g" ecosystem.config.js

# ==========================================
# 10. START DENGAN PM2
# ==========================================
echo -e "${YELLOW}🚀 Starting bot dengan PM2...${NC}"

# Stop dulu kalau ada
pm2 delete all 2>/dev/null

# Start dengan ecosystem
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# ==========================================
# 11. TAMPILKAN INFORMASI
# ==========================================
echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}   ✅ INSTALLASI SELESAI!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${BLUE}📁 Lokasi: ~/sung-jin-woo-bot${NC}"
echo ""
echo -e "${YELLOW}📌 LANGKAH SELANJUTNYA:${NC}"
echo ""
echo -e "1️⃣  Edit Token Telegram:"
echo -e "    ${BLUE}nano ~/sung-jin-woo-bot/config.js${NC}"
echo -e "    Ganti: ${YELLOW}YOUR_BOT_TOKEN_HERE${NC}"
echo -e "    Ganti: ${YELLOW}YOUR_TELEGRAM_ID_HERE${NC}"
echo ""
echo -e "2️⃣  Restart bot setelah edit:"
echo -e "    ${BLUE}pm2 restart all${NC}"
echo ""
echo -e "3️⃣  Cek status:"
echo -e "    ${BLUE}pm2 status${NC}"
echo -e "    ${BLUE}pm2 logs${NC}"
echo ""
echo -e "4️⃣  Pairing WhatsApp:"
echo -e "    Kirim ke Telegram bot: ${BLUE}/pair 628xxxxxxxxxx${NC}"
echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}   🎉 SELAMAT, BOT SIAP DIGUNAKAN!${NC}"
echo -e "${GREEN}==========================================${NC}"