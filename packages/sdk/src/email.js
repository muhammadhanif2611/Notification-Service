// Sub-client SDK untuk pengiriman Email
export class EmailClient {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Mengirim email — bisa pakai body langsung atau templateCode + variables.
   * @param {{ to: string, subject?: string, body?: string, templateCode?: string, variables?: object }} params
   */
  async send({ to, subject, body, templateCode, variables }) {
    return this.httpClient.post('/v1/notifications/send', {
      channel: 'EMAIL',
      recipient: to,
      subject,
      body,
      templateCode,
      variables
    });
  }
}
