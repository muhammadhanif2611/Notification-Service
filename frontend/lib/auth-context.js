"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "ngw_token";
const USER_KEY = "ngw_user";

/**
 * AuthProvider — Context provider untuk autentikasi dashboard.
 * Login via gateway → auth-service (POST /v1/auth/login).
 * Token JWT disimpan di localStorage (expiry 8 jam sesuai IMPLEMENTATION_PLAN).
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
function readStoredSession() {
  try {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedToken && storedUser) {
      return { token: storedToken, user: JSON.parse(storedUser) };
    }
  } catch {
    // localStorage tidak tersedia
  }
  return { token: null, user: null };
}

export function AuthProvider({ children }) {
  // Session dibaca sinkron via lazy initializer saat mount di client.
  // loading=false karena tidak ada proses async untuk restore session.
  const [session, setSession] = useState(() => {
    if (typeof window === "undefined") return { token: null, user: null };
    return readStoredSession();
  });
  const router = useRouter();

  const { user, token } = session;
  const loading = false;

  const login = useCallback(async (email, password) => {
    const res = await apiPost("/v1/auth/login", { email, password });
    const data = res.data || res;
    const { token: jwt, user: userData } = data;

    if (!jwt) throw new Error("Token tidak diterima dari server");

    localStorage.setItem(TOKEN_KEY, jwt);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setSession({ token: jwt, user: userData });

    // Redirect berdasarkan role
    const target = userData?.role === "admin" ? "/admin/control-center" : "/client";
    router.push(target);
    return userData;
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setSession({ token: null, user: null });
    router.push("/login");
  }, [router]);

  const getAuthHeaders = useCallback(() => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, getAuthHeaders, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth — Hook untuk mengakses auth context.
 * @returns {{ user: object|null, token: string|null, loading: boolean, login: Function, logout: Function, getAuthHeaders: Function, isAdmin: boolean }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus digunakan dalam AuthProvider");
  return ctx;
}

/**
 * getStoredToken — Helper untuk mendapatkan token dari localStorage (di luar React).
 * @returns {string|null}
 */
export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
