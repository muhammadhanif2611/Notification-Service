/**
 * Handler HTTP Client internal SDK dengan proteksi timeout, retry backoff, dan error handling.
 */
export class HttpClient {
  /**
   * @param {object} configuration
   * @param {string} configuration.apiKey - API Key untuk autentikasi
   * @param {string} [configuration.baseUrl='http://localhost:3001'] - URL Gateway API
   * @param {number} [configuration.timeout=10000] - Timeout dalam milidetik
   * @param {number} [configuration.maxRetries=2] - Jumlah percobaan ulang untuk network error
   */
  constructor(configuration) {
    this.apiKey = configuration.apiKey;
    this.baseUrl = (configuration.baseUrl || 'http://localhost:3001').replace(/\/$/, '');
    this.timeoutMilliseconds = configuration.timeout || 10000;
    this.maxRetries = configuration.maxRetries ?? 2;
  }

  /**
   * Mengirim request HTTP POST dengan timeout dan retry backoff.
   *
   * @param {string} endpointPath - Path relatif endpoint (mis. '/v1/notifications/send')
   * @param {object} requestPayload - Body JSON request
   * @returns {Promise<any>}
   */
  async post(endpointPath, requestPayload) {
    let lastError = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const httpResponse = await fetch(`${this.baseUrl}${endpointPath}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
          },
          body: JSON.stringify(requestPayload),
          signal: AbortSignal.timeout(this.timeoutMilliseconds)
        });

        const data = await httpResponse.json().catch(() => ({}));

        if (!httpResponse.ok) {
          const errMessage = data?.error?.message || `Request failed with status ${httpResponse.status}`;
          const error = new Error(errMessage);
          error.status = httpResponse.status;
          error.code = data?.error?.code;
          error.details = data?.error?.details;

          // Jangan retry client error (4xx) kecuali 429 (Rate Limit)
          if (httpResponse.status < 500 && httpResponse.status !== 429) {
            throw error;
          }
          lastError = error;
        } else {
          return data;
        }
      } catch (err) {
        lastError = err;
        if (err.status && err.status < 500 && err.status !== 429) {
          throw err;
        }
      }

      // Exponential backoff sebelum retry
      if (attempt < this.maxRetries) {
        const backoffMs = 500 * (2 ** attempt);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError;
  }
}
