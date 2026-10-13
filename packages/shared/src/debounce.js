/**
 * Debounce, Throttle, and Outbound Protection Utilities.
 * Digunakan untuk mencegah pemanggilan fungsi/API ke luar secara terus-menerus
 * tanpa kendali (anti-spam, rate protection, burst mitigation).
 */

/**
 * Membuat versi debounced dari sebuah fungsi.
 * Fungsi hanya dieksekusi setelah jeda `waitMs` sejak pemanggilan terakhir.
 *
 * @param {Function} func - Fungsi yang akan di-debounce
 * @param {number} waitMs - Waktu tunggu dalam milidetik
 * @param {object} [options]
 * @param {boolean} [options.leading=false] - Eksekusi di awal sebelum jeda
 * @param {boolean} [options.trailing=true] - Eksekusi di akhir setelah jeda
 * @returns {Function & { cancel: Function, flush: Function }} Fungsi debounced
 */
export function debounce(func, waitMs = 300, { leading = false, trailing = true } = {}) {
  let timerId = null;
  let lastArgs = null;
  let lastThis = null;
  let result = null;

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;

    const callNow = leading && !timerId;

    if (timerId) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => {
      timerId = null;
      if (trailing && (!leading || lastArgs)) {
        result = func.apply(lastThis, lastArgs);
        lastArgs = null;
        lastThis = null;
      }
    }, waitMs);

    if (callNow) {
      result = func.apply(lastThis, lastArgs);
      lastArgs = null;
      lastThis = null;
    }

    return result;
  }

  debounced.cancel = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  debounced.flush = () => {
    if (timerId && lastArgs) {
      clearTimeout(timerId);
      timerId = null;
      result = func.apply(lastThis, lastArgs);
      lastArgs = null;
      lastThis = null;
    }
    return result;
  };

  return debounced;
}

/**
 * Membuat versi throttled dari sebuah fungsi.
 * Fungsi hanya dieksekusi paling banyak satu kali setiap `waitMs`.
 *
 * @param {Function} func - Fungsi yang akan di-throttle
 * @param {number} waitMs - Interval minimal dalam milidetik
 * @returns {Function & { cancel: Function }}
 */
export function throttle(func, waitMs = 1000) {
  let inThrottle = false;
  let lastArgs = null;
  let lastThis = null;
  let timerId = null;

  function throttled(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      timerId = setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          throttled.apply(lastThis, lastArgs);
          lastArgs = null;
          lastThis = null;
        }
      }, waitMs);
    } else {
      lastArgs = args;
      lastThis = this;
    }
  }

  throttled.cancel = () => {
    if (timerId) clearTimeout(timerId);
    inThrottle = false;
    lastArgs = null;
    lastThis = null;
  };

  return throttled;
}

/**
 * Circuit Breaker untuk melindungi pemanggilan API ke luar dari kegagalan berulang.
 * Jika endpoint eksternal gagal terus-menerus, circuit berpindah ke status OPEN
 * dan menolak request sementara untuk mencegah flooding.
 */
export class CircuitBreaker {
  /**
   * @param {object} options
   * @param {number} [options.failureThreshold=5] - Jumlah kegagalan berturut-turut sebelum OPEN
   * @param {number} [options.cooldownMs=30000] - Waktu tunggu (ms) sebelum mencoba kembali (HALF-OPEN)
   * @param {string} [options.name='default'] - Nama sirkuit untuk logging
   */
  constructor({ failureThreshold = 5, cooldownMs = 30000, name = 'default' } = {}) {
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.name = name;
    this.failureCount = 0;
    this.state = 'CLOSED'; // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    this.nextAttempt = Date.now();
  }

  /**
   * Mengecek apakah pemanggilan diizinkan.
   * @returns {boolean}
   */
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

  /**
   * Mencatat keberhasilan pemanggilan. Mereset kegagalan.
   */
  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  /**
   * Mencatat kegagalan pemanggilan.
   */
  recordFailure() {
    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.cooldownMs;
    }
  }

  /**
   * Menjalankan fungsi dengan proteksi circuit breaker.
   * @param {Function} asyncFn - Fungsi async yang akan dijalankan
   * @returns {Promise<any>}
   */
  async execute(asyncFn) {
    if (!this.canExecute()) {
      const waitSec = Math.ceil((this.nextAttempt - Date.now()) / 1000);
      throw new Error(`Circuit breaker '${this.name}' is OPEN. Target external endpoint is failing. Cooldown: ${waitSec}s`);
    }

    try {
      const result = await asyncFn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }
}

/**
 * Debounced Batcher untuk pengiriman event (misalnya webhook external callback).
 * Mengumpulkan event dalam rentang waktu `windowMs` atau sampai `maxBatchSize`
 * sebelum memicu handler, sehingga tidak memanggil API ke luar satu-per-satu terus menerus.
 */
export class DebouncedBatcher {
  /**
   * @param {object} options
   * @param {Function} options.handler - Callback (key, items[]) => Promise<void>
   * @param {number} [options.windowMs=1000] - Jendela debounce (ms)
   * @param {number} [options.maxBatchSize=50] - Ukuran batch maksimal sebelum auto-flush
   */
  constructor({ handler, windowMs = 1000, maxBatchSize = 50 }) {
    this.handler = handler;
    this.windowMs = windowMs;
    this.maxBatchSize = maxBatchSize;
    this.buffers = new Map(); // key -> { items: [], timer: timeoutId }
  }

  /**
   * Menambahkan item ke antrean buffer per key.
   * @param {string} key - Identifier grup (misalnya `projectId:webhookUrl`)
   * @param {any} item - Data event
   */
  add(key, item) {
    let entry = this.buffers.get(key);
    if (!entry) {
      entry = { items: [], timer: null };
      this.buffers.set(key, entry);
    }

    entry.items.push(item);

    // Jika melebihi batas ukuran batch, langsung trigger
    if (entry.items.length >= this.maxBatchSize) {
      this.flush(key);
      return;
    }

    // Reset debounce timer setiap ada item baru
    if (entry.timer) {
      clearTimeout(entry.timer);
    }

    entry.timer = setTimeout(() => {
      this.flush(key);
    }, this.windowMs);
  }

  /**
   * Mengosongkan dan mengeksekusi buffer untuk key tertentu.
   * @param {string} key
   */
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
    } catch (err) {
      // Handler bertanggung jawab menangani log/retry
    }
  }

  /**
   * Mengosongkan seluruh buffer.
   */
  async flushAll() {
    const keys = [...this.buffers.keys()];
    await Promise.allSettled(keys.map((k) => this.flush(k)));
  }
}
