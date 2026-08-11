// Sub-client SDK untuk pengiriman Email
export class EmailClient {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  // Mengirim pesan notifikasi email
  async send({ to, subject, body }) {
    return this.httpClient.post('/v1/notifications/send', {
      channel: 'EMAIL',
      recipient: to,
      subject,
      body
    });
  }
}
