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
# CEK USER
# ==========================================
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Jangan jalankan sebagai root!${NC}"
    exit 1
fi

USERNAME=$(whoami)
echo -e "${YELLOW}👤 User: $USERNAME${NC}"

# ==========================================
# UPDATE & INSTALL DEPENDENCIES
# ==========================================
echo -e "${YELLOW}📦 Update packages...${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "${YELLOW}📦 Install dependencies...${NC}"
sudo apt install -y \
    git curl wget nodejs npm build-essential ffmpeg imagemagick

# ==========================================
# INSTALL PM2
# ==========================================
echo -e "${YELLOW}📦 Install PM2...${NC}"
sudo npm install -g pm2
pm2 update

# ==========================================
# CLONE REPO (KALAU BELUM)
# ==========================================
if [ ! -d ~/sung-jin-woo-bot ]; then
    echo -e "${YELLOW}📁 Clone repository...${NC}"
    cd ~
    git clone https://github.com/kjsstore/Sung-jin-woo_bot.git ~/sung-jin-woo-bot
fi

cd ~/sung-jin-woo-bot

# ==========================================
# INSTALL TELEGRAM BOT DEPENDENCIES
# ==========================================
echo -e "${YELLOW}🤖 Setup Telegram Bot...${NC}"
npm install --force
npm install node-telegram-bot-api axios express --force

# ==========================================
# INSTALL WHATSAPP BOT DEPENDENCIES
# ==========================================
echo -e "${YELLOW}📱 Setup WhatsApp Bot...${NC}"
cd ~/sung-jin-woo-bot/wabot
npm install --force
npm install @whiskeysockets/baileys @hapi/boom qrcode cfonts axios express --force

# ==========================================
# BUAT FOLDER DAN FILE KONFIGURASI
# ==========================================
echo -e "${YELLOW}⚙️ Setup konfigurasi...${NC}"
cd ~/sung-jin-woo-bot

mkdir -p ~/sung-jin-woo-bot/wabot/sessions

# ==========================================
# BUAT PM2 ECOSYSTEM
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
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'wabot',
      cwd: '/home/USERNAME_PLACEHOLDER/sung-jin-woo-bot/wabot',
      script: 'index.js',
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' }
    }
  ]
};
EOF

sed -i "s|USERNAME_PLACEHOLDER|$USERNAME|g" ecosystem.config.js

# ==========================================
# START DENGAN PM2
# ==========================================
echo -e "${YELLOW}🚀 Starting bot dengan PM2...${NC}"
pm2 delete all 2>/dev/null
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -1 | bash

# ==========================================
# TAMPILKAN INFORMASI
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
echo -e "1️⃣  Edit Token:"
echo -e "    ${BLUE}nano ~/sung-jin-woo-bot/config.js${NC}"
echo ""
echo -e "2️⃣  Restart: ${BLUE}pm2 restart all${NC}"
echo ""
echo -e "3️⃣  Cek status: ${BLUE}pm2 status${NC}"
echo -e "    Logs: ${BLUE}pm2 logs${NC}"
echo ""
echo -e "4️⃣  Pairing WA: ${BLUE}/pair 628xxxxxxxxxx${NC} di Telegram"
echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}   🎉 SELAMAT!${NC}"
echo -e "${GREEN}==========================================${NC}"