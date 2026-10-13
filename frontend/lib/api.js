// =============================================================================
// API Fetch Wrapper (Frontend)
// =============================================================================
// Utility untuk memanggil backend API dari frontend dengan proteksi:
// - In-flight request deduplication (mencegah request ganda simultan)
// - Debounce & cooldown mechanism (mencegah spam polling berulang)
// - Timeout otomatis 10s (mencegah fetch menggantung)
// =============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";
const REQUEST_TIMEOUT_MS = 10000;

// In-flight GET request deduplication cache: urlKey -> Promise
const inFlightRequests = new Map();

// Debounce timer cache untuk request berbasis debounce
const debounceTimers = new Map();

/**
 * buildHeaders — Membangun headers untuk request, termasuk JWT jika tersedia.
 * @param {object} [options] - Opsi tambahan
 * @param {string} [options.apiKey] - API Key untuk autentikasi
 * @returns {Record<string, string>} Headers object
 */
function buildHeaders(options = {}) {
  const headers = { "Content-Type": "application/json" };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ngw_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.apiKey) headers["x-api-key"] = options.apiKey;
  return headers;
}

/**
 * handleErrorResponse — Memproses response non-OK dari backend.
 * @param {Response} res - Fetch response
 * @throws {Error}
 */
async function handleErrorResponse(res) {
  const error = await res.json().catch(() => ({}));
  const message =
    error.error?.message || error.message || `Request gagal (HTTP ${res.status})`;

  if (res.status === 401 && typeof window !== "undefined") {
    const isLoginPage = window.location.pathname.startsWith("/login");
    if (!isLoginPage) {
      localStorage.removeItem("ngw_token");
      localStorage.removeItem("ngw_user");
      window.location.href = "/login?expired=1";
    }
  }

  throw new Error(message);
}

/**
 * GET request ke backend API.
 * Dilengkapi in-flight deduplication: jika request identik sedang berjalan,
 * return promise yang sama untuk menghemat bandwidth & beban server.
 *
 * @param {string} path - Path endpoint (misal: "/v1/logs")
 * @param {object} [options] - Opsi tambahan
 * @param {string} [options.apiKey] - API Key untuk autentikasi
 * @param {boolean} [options.skipDedupe=false] - Bypass in-flight deduplication
 * @returns {Promise<any>} Response JSON
 */
export async function apiGet(path, options = {}) {
  const url = `${API_URL}${path}`;
  const cacheKey = `${path}::${options.apiKey || ''}`;

  if (!options.skipDedupe && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const requestPromise = (async () => {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: buildHeaders(options),
        credentials: "include",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });

      if (!res.ok) await handleErrorResponse(res);
      return await res.json();
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  if (!options.skipDedupe) {
    inFlightRequests.set(cacheKey, requestPromise);
  }

  return requestPromise;
}

/**
 * Debounced version dari apiGet.
 * Hanya mengeksekusi request jika tidak ada panggilan baru dalam jeda `waitMs`.
 * Sangat berguna untuk input pencarian atau trigger yang berubah cepat.
 *
 * @param {string} path
 * @param {number} [waitMs=300]
 * @param {object} [options]
 * @returns {Promise<any>}
 */
export function debouncedApiGet(path, waitMs = 300, options = {}) {
  const timerKey = `debounced::${path}`;

  return new Promise((resolve, reject) => {
    if (debounceTimers.has(timerKey)) {
      clearTimeout(debounceTimers.get(timerKey));
    }

    const timer = setTimeout(async () => {
      debounceTimers.delete(timerKey);
      try {
        const res = await apiGet(path, options);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    }, waitMs);

    debounceTimers.set(timerKey, timer);
  });
}

/**
 * POST request ke backend API.
 * @param {string} path - Path endpoint
 * @param {object} body - Request body
 * @param {object} [options] - Opsi tambahan
 * @returns {Promise<any>} Response JSON
 */
export async function apiPost(path, body, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: buildHeaders(options),
    credentials: "include",
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!res.ok) await handleErrorResponse(res);
  return res.json();
}

/**
 * PUT request ke backend API.
 */
export async function apiPut(path, body, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: buildHeaders(options),
    credentials: "include",
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!res.ok) await handleErrorResponse(res);
  return res.json();
}

/**
 * DELETE request ke backend API.
 */
export async function apiDelete(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: buildHeaders(options),
    credentials: "include",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!res.ok) await handleErrorResponse(res);
  return res.json();
}
