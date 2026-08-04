export class HttpClient {
  /**
   * @param {object} config
   * @param {string} config.apiKey
   * @param {string} [config.baseUrl]
   * @param {number} [config.timeout]
   */
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'http://localhost:3001';
    this.timeout = config.timeout || 10000;
  }

  async post(path, payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      return await response.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${this.timeout}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
