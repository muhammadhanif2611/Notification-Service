// Sub-client SDK untuk pengiriman notifikasi massal (broadcast)
export class BroadcastClient {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Mengirim pesan ke banyak penerima sekaligus.
   * Mendukung personalisasi per penerima via `recipientVariables`.
   *
   * @param {object} opts
   * @param {string} opts.channel - 'WHATSAPP' atau 'EMAIL'
   * @param {string[]} opts.recipients - Daftar nomor HP / email penerima
   * @param {string} [opts.templateCode] - Kode template yang sudah di-approve
   * @param {string} [opts.body] - Isi pesan (jika tidak pakai template)
   * @param {string} [opts.subject] - Subject email (khusus EMAIL)
   * @param {object} [opts.variables] - Variabel global, berlaku untuk semua penerima
   * @param {object} [opts.recipientVariables] - Variabel per penerima: { '628xxx': { nama: 'Biagi' }, ... }
   */
  async send({ channel, recipients, templateCode, body, subject, variables, recipientVariables }) {
    return this.httpClient.post('/v1/notifications/broadcast', {
      channel,
      recipients,
      templateCode,
      body,
      subject,
      variables,
      recipientVariables
    });
  }
}
