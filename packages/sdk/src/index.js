import { HttpClient } from './http.js';
import { WhatsAppClient } from './whatsapp.js';
import { EmailClient } from './email.js';

// Client utama SDK Notification Gateway
export class NotificationClient {
  constructor(configuration) {
    if (!configuration || !configuration.apiKey) {
      throw new Error('API Key (apiKey) is required to initialize NotificationClient');
    }
    this.httpClient = new HttpClient(configuration);
    this.whatsapp = new WhatsAppClient(this.httpClient);
    this.email = new EmailClient(this.httpClient);
  }
}
