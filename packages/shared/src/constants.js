export const NOTIFICATION_STATUS = {
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED'
};

export const CHANNELS = {
  WHATSAPP: 'WHATSAPP',
  EMAIL: 'EMAIL'
};

export const API_KEY_PREFIX = {
  PRODUCTION: 'ngw_prod_',
  SANDBOX: 'ngw_sand_'
};

// Provider vendor yang dikelola — saat ini hanya Nodemailer (Email).
export const VENDOR_PROVIDERS = {
  NODEMAILER: 'NODEMAILER'
};

export const WHATSAPP_SESSION_STATUS = {
  CONNECTING: 'CONNECTING',
  WAITING_QR: 'WAITING_QR',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED'
};
