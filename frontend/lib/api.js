// =============================================================================
// API Fetch Wrapper (Frontend)
// =============================================================================
// Utility untuk memanggil backend API dari frontend.
// Usage:
//   import { apiGet, apiPost } from "@/lib/api";
//   const data = await apiGet("/api/messages?status=SENT");
//   const result = await apiPost("/api/notifications", { channel: "WHATSAPP", ... });
// =============================================================================

// PENTING: Gunakan 127.0.0.1 (bukan "localhost") — Docker Desktop di Windows
// me-resolve "localhost" ke IPv6 ::1 sehingga request hang ~15 detik.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";

/**
 * buildHeaders — Membangun headers untuk request, termasuk JWT jika tersedia.
 * @param {object} [options] - Opsi tambahan
 * @param {string} [options.apiKey] - API Key untuk autentikasi
 * @returns {Record<string, string>} Headers object
 */
function buildHeaders(options = {}) {
  const headers = { "Content-Type": "application/json" };

  // JWT dari localStorage untuk request dashboard
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ngw_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.apiKey) headers["x-api-key"] = options.apiKey;
  return headers;
}

/**
 * GET request ke backend API.
 * @param {string} path - Path endpoint (misal: "/v1/logs")
 * @param {object} [options] - Opsi tambahan
 * @param {string} [options.apiKey] - API Key untuk autentikasi
 * @returns {Promise<any>} Response JSON
 */
export async function apiGet(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: buildHeaders(options),
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request gagal" }));
    throw new Error(error.message || error.error?.message || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * POST request ke backend API.
 * @param {string} path - Path endpoint
 * @param {object} body - Request body
 * @param {object} [options] - Opsi tambahan
 * @param {string} [options.apiKey] - API Key untuk autentikasi
 * @returns {Promise<any>} Response JSON
 */
export async function apiPost(path, body, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: buildHeaders(options),
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request gagal" }));
    throw new Error(error.message || error.error?.message || `HTTP ${res.status}`);
  }

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
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request gagal" }));
    throw new Error(error.message || error.error?.message || `HTTP ${res.status}`);
  }

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
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request gagal" }));
    throw new Error(error.message || error.error?.message || `HTTP ${res.status}`);
  }

  return res.json();
}
