import { HttpClient } from './http.js';
import { WhatsAppClient } from './whatsapp.js';
import { EmailClient } from './email.js';
import { BroadcastClient } from './broadcast.js';
import { verifyWebhookSignature, WebhooksClient } from './verifyWebhook.js';

// Client utama SDK Notification Gateway
export class NotificationClient {
  constructor(configuration) {
    if (!configuration || !configuration.apiKey) {
      throw new Error('API Key (apiKey) is required to initialize NotificationClient');
    }
    this.httpClient = new HttpClient(configuration);
    this.whatsapp = new WhatsAppClient(this.httpClient);
    this.email = new EmailClient(this.httpClient);
    this.broadcast = new BroadcastClient(this.httpClient);
    // Verifikasi webhook ala Resend: client.webhooks.verify({ payload, headers, secret })
    // Mengembalikan event hasil parse, atau melempar error jika signature/timestamp invalid.
    this.webhooks = new WebhooksClient();
  }

  // Verifikasi signature webhook LEGACY (hex dari JSON body) — gunakan webhooks.verify() untuk integrasi baru
  verifyWebhook({ payload, signature, secret }) {
    return verifyWebhookSignature({ payload, signature, secret });
  }

  /**
   * Ping / Verifikasi koneksi dan validitas API Key ke Notification Gateway.
   * Dipanggil saat setup pertama kali setelah download SDK.
   * @returns {Promise<{ success: boolean, data: { status: string, project: object, environment: string, timestamp: string } }>}
   */
  async ping() {
    return this.httpClient.get('/v1/notifications/ping');
  }

  /**
   * Alias untuk ping()
   */
  async testConnection() {
    return this.ping();
  }
}
