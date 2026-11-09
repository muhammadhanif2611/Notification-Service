// Utilitas CircuitBreaker dan DebouncedBatcher untuk proteksi dan batching pengiriman webhook keluar.
export class CircuitBreaker {
  constructor({ failureThreshold = 5, cooldownMs = 30000, name = 'default' } = {}) {
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.name = name;
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }

  canExecute() {
    const now = Date.now();
    if (this.state === 'OPEN') {
      if (now >= this.nextAttempt) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.cooldownMs;
    }
  }
}

export class DebouncedBatcher {
  constructor({ handler, windowMs = 1000, maxBatchSize = 50 }) {
    this.handler = handler;
    this.windowMs = windowMs;
    this.maxBatchSize = maxBatchSize;
    this.buffers = new Map();
  }

  add(key, item) {
    let entry = this.buffers.get(key);
    if (!entry) {
      entry = { items: [], timer: null };
      this.buffers.set(key, entry);
    }

    entry.items.push(item);

    if (entry.items.length >= this.maxBatchSize) {
      this.flush(key);
      return;
    }

    if (entry.timer) {
      clearTimeout(entry.timer);
    }

    entry.timer = setTimeout(() => {
      this.flush(key);
    }, this.windowMs);
  }

  async flush(key) {
    const entry = this.buffers.get(key);
    if (!entry || entry.items.length === 0) return;

    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }

    const itemsToProcess = [...entry.items];
    entry.items = [];
    this.buffers.delete(key);

    try {
      await this.handler(key, itemsToProcess);
    } catch {
      // Error telah ditangani di dalam handler
    }
  }

  async flushAll() {
    const keys = [...this.buffers.keys()];
    await Promise.allSettled(keys.map((k) => this.flush(k)));
  }
}
