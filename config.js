// ==========================================
// 🔥 CONFIG.JS - FULL CONFIGURATION
// ==========================================

module.exports = {
  // ============================
  // 🤖 BOT CONFIG
  // ============================
  BOT: {
    TOKEN: process.env.BOT_TOKEN || "8827268751:AAER4QeenZmLJ_WIeF4aDKSq_F6kNFR3_I0",
    OWNER_ID: Number(process.env.OWNER_ID || "8677011932"),
    DOMAIN: "kjs-v0i•••curity[.]com"
  },
  
  // ============================
  // 🔥 PAYMENT AUTOGOPAY
  // ============================
  AUTOGOPAY: {
    ENABLED: true,
    API_URL: "https://v1-gateway.autogopay.site",
    API_KEY: "agp_64cf458250db631c55f1d8130b4ef2ba60ca6d87a5f556aae923d6fef6cbe37b",
    TIMEOUT: 30000,
  },

  // ============================
  // 💳 PAYMENT ORDERKUOTA / ORKUT
  // ============================
  ORDERKUOTA: {
    ENABLED: true,
    USERNAME: "kemetzs",
    TOKEN: "2476921:0bB7rs3pSF1yKCaU84JuIVtwQTGhmlkP",
    BEARER: "MjQ3NjkyMTpRYkFhYThHdGxza0NVWkhMM3U0d1ZtWQ==",
    API_BASE: "https://app.orderkuota.com",
    MUTASI_URL: "https://app.orderkuota.com/api/v1/qris/mutasi",
    QRIS_API: "https://orkut.cloudflareariprem.workers.dev/api/qris",
    QRIS_STRING: "00020101021126670016COM.NOBUBANK.WWW01189360050300000879140214033029764149470303UMI51440014ID.CO.QRIS.WWW0215ID20254096535860303UMI5204581253033605802ID5927CHIKEN MANG KEMET OK24769216006SERANG61054210062070703A016304D67B",
    PROXY: null,
    DEVICE: {
      APP_REG_ID: "c0kJIbm4SA6gDFtD4C72Fc%3AAPA91bGM94YX75ZlGfdAglNLgT5Igjpp-lTZbg8aDRSFRtIbMcAkkZpVuDE1JhV0xV2IAzLZedgb_TOvPIof-aWeyacmO6_9QbbnQxSDZSapLKtedM88QcU",
      PHONE_UUID: "c0kJIbm4SA6gDFtD4C72Fc",
      PHONE_MODEL: "23108RN04Y",
      PHONE_ANDROID_VERSION: "15",
      APP_VERSION_CODE: "260627",
      APP_VERSION_NAME: "26.06.27",
      UI_MODE: "light",
    },
    RATE_LIMIT: {
      MIN_INTERVAL: 5000,
      MAX_RETRY: 3,
      BACKOFF_MS: 300000,
    },
    MATCH_RANGE: 500,
    TIMEOUT: 15000,
  },

  // ============================
  // 🔥 HARGA SEWA BOT
  // ============================
  SEWA: {
    "1minggu": {
      label: "1 Minggu",
      price: 1,
      days: 7
    },
    "1bulan": {
      label: "1 Bulan",
      price: 100000,
      days: 30
    },
    "1tahun": {
      label: "1 Tahun",
      price: 500000,
      days: 365
    }
  },

  // ============================
  // 🔥 KONFIGURASI TOPUP
  // ============================
  TOPUP: {
    CHECK_INTERVAL: 15000,
    MAX_CHECKS: 40,
    EXPIRY_MINUTES: 15,
  },

  // ============================
  // 🔥 KONFIGURASI SEWA
  // ============================
  SEWA_CONFIG: {
    CHECK_INTERVAL: 15000,
    MAX_CHECKS: 40,
    EXPIRY_MINUTES: 15,
  },

  // ============================
  // 🔥🔥🔥 NOTIFIKASI KE OWNER & CHANNEL (UPDATED)
  // ============================
  NOTIFICATION: {
    // 🔥 PAKAI TOKEN BOT UTAMA (BUKAN BOT NOTIF TERPISAH)
    BOT_TOKEN: "8830298112:AAHl4NUsd80CcG_2jiL1o9PH7DA_K1fMfzU",
    CHAT_ID: "-1004333617968",
    ENABLED: true,
    SEND_TO_OWNER: true,
  },

  // ============================
  // 🔥 FITUR LAINNYA
  // ============================
  FEATURES: {
    SHOW_BANNER: false,
    SHOW_VIDEO: true,
    VIDEO_URL: "https://files.catbox.moe/mi29hh.mp4",
    USE_LOCAL_FILE: false,
  }
};