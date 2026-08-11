// Sub-client SDK untuk pengiriman notifikasi massal (broadcast)
export class BroadcastClient {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  // Mengirim pesan ke banyak penerima sekaligus
  async send({ channel, recipients, templateCode, body, subject, variables }) {
    return this.httpClient.post('/v1/notifications/broadcast', {
      channel,
      recipients,
      templateCode,
      body,
      subject,
      variables
    });
  }
}
