export class EmailClient {
  /**
   * @param {import('./http.js').HttpClient} http
   */
  constructor(http) {
    this.http = http;
  }

  /**
   * Send Email Notification
   * @param {object} params
   * @param {string} params.to - Recipient email address
   * @param {string} params.subject - Email subject
   * @param {string} params.body - Email HTML body content
   */
  async send(params) {
    return this.http.post('/v1/notifications/send', {
      channel: 'EMAIL',
      recipient: params.to,
      subject: params.subject,
      body: params.body
    });
  }
}
