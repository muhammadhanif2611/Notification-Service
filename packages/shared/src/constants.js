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

export const QUEUE_NAMES = {
  NOTIFICATION_DISPATCH: 'notification-dispatch-queue',
  WEBHOOK_DELIVERY: 'webhook-delivery-queue'
};
