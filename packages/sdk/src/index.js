import { HttpClient } from './http.js';
import { WhatsAppClient } from './whatsapp.js';
import { EmailClient } from './email.js';

export class NotificationClient {
  /**
   * Initialize Notification Gateway Client SDK
   * @param {object} config
   * @param {string} config.apiKey - API Key for authentication (ngw_prod_... or ngw_sand_...)
   * @param {string} [config.baseUrl] - Notification Gateway API base URL (default: http://localhost:3001)
   * @param {number} [config.timeout] - Timeout in milliseconds (default: 10000ms)
   */
  constructor(config) {
    if (!config || !config.apiKey) {
      throw new Error('API Key (apiKey) is required to initialize NotificationClient');
    }
    this.http = new HttpClient(config);
    this.whatsapp = new WhatsAppClient(this.http);
    this.email = new EmailClient(this.http);
  }
}
