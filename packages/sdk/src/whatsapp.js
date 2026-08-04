export class WhatsAppClient {
  /**
   * @param {import('./http.js').HttpClient} http
   */
  constructor(http) {
    this.http = http;
  }

  /**
   * Send WhatsApp Message or Template
   * @param {object} params
   * @param {string} params.to - Phone number (e.g. '6281234567890')
   * @param {string} [params.body] - Text message body
   * @param {string} [params.templateCode] - WhatsApp template code
   * @param {object} [params.variables] - Template variables placeholder object
   */
  async send(params) {
    return this.http.post('/v1/notifications/send', {
      channel: 'WHATSAPP',
      recipient: params.to,
      body: params.body,
      templateCode: params.templateCode,
      variables: params.variables
    });
  }
}
