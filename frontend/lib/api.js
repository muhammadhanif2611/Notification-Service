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
 * handleErrorResponse — Memproses response non-OK dari backend.
 * Jika 401 (token invalid/kedaluwarsa): hapus sesi & arahkan ke halaman login,
 * agar user tidak terjebak di halaman dengan token mati.
 * @param {Response} res - Fetch response
 * @throws {Error} Selalu melempar error dengan pesan yang jelas
 */
async function handleErrorResponse(res) {
  const error = await res.json().catch(() => ({}));
  const message =
    error.error?.message || error.message || `Request gagal (HTTP ${res.status})`;

  // Token kedaluwarsa/invalid → bersihkan sesi dan paksa login ulang
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

  if (!res.ok) await handleErrorResponse(res);
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
  });

  if (!res.ok) await handleErrorResponse(res);
  return res.json();
}
