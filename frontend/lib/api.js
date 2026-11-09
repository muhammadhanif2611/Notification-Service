import { API_URL } from "./config.js";

// Wrapper fetch API frontend dengan proteksi in-flight deduplication dan timeout otomatis 30 detik.
const REQUEST_TIMEOUT_MS = 30000;
const inFlightRequests = new Map();

async function requestJson(url, init) {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) await handleErrorResponse(response);
    return await response.json();
  } catch (failure) {
    if (failure.name !== "TimeoutError" && failure.status !== 504) throw failure;
    const outcomeUnknown = init.method !== "GET";
    const error = new Error(
      outcomeUnknown
        ? "Respons server melewati batas waktu. Perubahan mungkin sudah tersimpan. Periksa daftar sebelum mencoba lagi."
        : "Server belum merespons dalam batas waktu. Silakan muat ulang data."
    );
    error.code = "REQUEST_TIMEOUT";
    error.outcomeUnknown = outcomeUnknown;
    throw error;
  }
}

function buildHeaders(options = {}) {
  const headers = { "Content-Type": "application/json" };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ngw_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.apiKey) headers["x-api-key"] = options.apiKey;
  return headers;
}

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

  const apiError = new Error(message);
  apiError.status = res.status;
  apiError.code = error.error?.code;
  throw apiError;
}

export async function apiGet(path, options = {}) {
  const url = `${API_URL}${path}`;
  const cacheKey = `${path}::${options.apiKey || ""}`;

  if (!options.skipDedupe && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const requestPromise = (async () => {
    try {
      return await requestJson(url, {
        method: "GET",
        headers: buildHeaders(options),
        credentials: "include",
      });
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  if (!options.skipDedupe) {
    inFlightRequests.set(cacheKey, requestPromise);
  }

  return requestPromise;
}

export async function apiPost(path, body, options = {}) {
  return requestJson(`${API_URL}${path}`, {
    method: "POST",
    headers: buildHeaders(options),
    credentials: "include",
    body: JSON.stringify(body),
  });
}

export async function apiPut(path, body, options = {}) {
  return requestJson(`${API_URL}${path}`, {
    method: "PUT",
    headers: buildHeaders(options),
    credentials: "include",
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path, options = {}) {
  return requestJson(`${API_URL}${path}`, {
    method: "DELETE",
    headers: buildHeaders(options),
    credentials: "include",
  });
}
