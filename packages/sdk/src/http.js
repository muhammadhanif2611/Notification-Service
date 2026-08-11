// Handler HTTP Client internal SDK dengan timeout otomatis
export class HttpClient {
  constructor(configuration) {
    this.apiKey = configuration.apiKey;
    this.baseUrl = configuration.baseUrl || 'http://localhost:3001';
    this.timeoutMilliseconds = configuration.timeout || 10000;
  }

  // Mengirim request HTTP POST
  async post(endpointPath, requestPayload) {
    const abortController = new AbortController();
    const timeoutTimer = setTimeout(() => abortController.abort(), this.timeoutMilliseconds);

    try {
      const httpResponse = await fetch(`${this.baseUrl}${endpointPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify(requestPayload),
        signal: abortController.signal
      });

      return await httpResponse.json();
    } catch (requestError) {
      if (requestError.name === 'AbortError') {
        throw new Error(`Request timed out after ${this.timeoutMilliseconds}ms`);
      }
      throw requestError;
    } finally {
      clearTimeout(timeoutTimer);
    }
  }
}
