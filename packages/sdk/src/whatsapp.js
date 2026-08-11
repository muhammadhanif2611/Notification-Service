// Sub-client SDK untuk pengiriman WhatsApp
export class WhatsAppClient {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  // Mengirim pesan atau template WhatsApp
  async send({ to, body, templateCode, variables }) {
    return this.httpClient.post('/v1/notifications/send', {
      channel: 'WHATSAPP',
      recipient: to,
      body,
      templateCode,
      variables
    });
  }
}
