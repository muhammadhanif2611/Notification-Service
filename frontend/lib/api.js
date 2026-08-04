// =============================================================================
// API Fetch Wrapper (Frontend)
// =============================================================================
// Utility untuk memanggil backend API dari frontend.
// Usage:
//   import { apiGet, apiPost } from "@/lib/api";
//   const data = await apiGet("/api/messages?status=SENT");
//   const result = await apiPost("/api/notifications", { channel: "WHATSAPP", ... });
// =============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * GET request ke backend API.
 * @param {string} path - Path endpoint (misal: "/api/messages")
 * @param {object} [options] - Opsi tambahan
 * @param {string} [options.apiKey] - API Key untuk autentikasi
 * @returns {Promise<any>} Response JSON
 */
export async function apiGet(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (options.apiKey) {
    headers["x-api-key"] = options.apiKey;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request gagal" }));
    throw new Error(error.message || `HTTP ${res.status}`);
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
  const headers = {
    "Content-Type": "application/json",
  };

  if (options.apiKey) {
    headers["x-api-key"] = options.apiKey;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request gagal" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * PUT request ke backend API.
 */
export async function apiPut(path, body, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (options.apiKey) headers["x-api-key"] = options.apiKey;

  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request gagal" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * DELETE request ke backend API.
 */
export async function apiDelete(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (options.apiKey) headers["x-api-key"] = options.apiKey;

  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request gagal" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}
