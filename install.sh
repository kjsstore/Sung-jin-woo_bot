#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}   🔧 SUNG-JIN-WOO BOT INSTALLER${NC}"
echo -e "${GREEN}==========================================${NC}"

# CEK USER
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Jangan jalankan sebagai root!${NC}"
    exit 1
fi

# 1. INSTALL NODEJS 20 LTS
echo -e "${YELLOW}📦 Install Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs npm

# 2. INSTALL PM2
echo -e "${YELLOW}📦 Install PM2...${NC}"
sudo npm install -g pm2

# 3. CLONE REPO
cd ~
if [ ! -d "Sung-jin-woo_bot" ]; then
    git clone https://github.com/kjsstore/Sung-jin-woo_bot.git
fi
cd Sung-jin-woo_bot

# 4. BUAT CONFIG.JS
echo -e "${YELLOW}⚙️ Membuat config.js...${NC}"
cat > config.js << 'EOF'
module.exports = {
  BOT: {
    TOKEN: "YOUR_BOT_TOKEN_HERE",
    OWNER_ID: "YOUR_TELEGRAM_ID_HERE"
  }
};
EOF

# 5. BUAT FOLDER FUNCTION DI WABOT
echo -e "${YELLOW}📁 Membuat folder function...${NC}"
mkdir -p wabot/function

# 6. BUAT FILE PURCHASE FLOW (DUMMY)
echo -e "${YELLOW}📝 Membuat purchaseFlow.js...${NC}"
cat > wabot/function/purchaseFlow.js << 'EOF'
exports.handleMessage = async (sock, m, context) => {
    return false;
};
EOF

# 7. BUAT FILE TRIAL FLOW (DUMMY)
echo -e "${YELLOW}📝 Membuat trialFlow.js...${NC}"
cat > wabot/function/trialFlow.js << 'EOF'
exports.handleMessage = async (sock, m) => {
    return false;
};
EOF

# 8. BUAT FILE RENEW FLOW (DUMMY)
echo -e "${YELLOW}📝 Membuat renewFlow.js...${NC}"
cat > wabot/function/renewFlow.js << 'EOF'
exports.handleMessage = async (sock, m, context) => {
    return false;
};
EOF

# 9. INSTALL DEPENDENSI TELEGRAM
echo -e "${YELLOW}🤖 Install Telegram Bot...${NC}"
npm install --force

# 10. INSTALL DEPENDENSI WA
echo -e "${YELLOW}📱 Install WhatsApp Bot...${NC}"
cd wabot
npm install --force
cd ..

# 11. BUAT FOLDER SESSION
mkdir -p wabot/sessions

# 12. PM2 ECOSYSTEM
echo -e "${YELLOW}⚙️ Setup PM2...${NC}"
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'telegram-bot',
      cwd: '/root/Sung-jin-woo_bot',
      script: 'index.js',
      autorestart: true,
      max_memory_restart: '500M'
    },
    {
      name: 'wabot',
      cwd: '/root/Sung-jin-woo_bot/wabot',
      script: 'index.js',
      autorestart: true,
      max_memory_restart: '500M'
    }
  ]
};
EOF

# 13. START
pm2 delete all 2>/dev/null
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -1 | bash

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}   ✅ INSTALLASI SELESAI!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${YELLOW}📌 EDIT CONFIG:${NC}"
echo -e "   nano ~/Sung-jin-woo_bot/config.js"
echo ""
echo -e "${YELLOW}📌 RESTART:${NC}"
echo -e "   pm2 restart all"
echo ""
echo -e "${YELLOW}📌 CEK STATUS:${NC}"
echo -e "   pm2 status"
echo -e "   pm2 logs"
echo ""