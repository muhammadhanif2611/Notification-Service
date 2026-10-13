"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet } from "@/lib/api";

const DEFAULT_SCOPE = ["vendors", "statistics", "logs", "health"];
const VISIBILITY_STALE_MS = 30000; // Minimal 30 detik jeda sebelum auto-refresh saat tab aktif kembali

/**
 * Custom hook untuk mengambil data admin dari berbagai microservice secara terkontrol.
 * Dilengkapi dengan:
 * - Scoped fetching (hanya fetch endpoint yang dibutuhkan halaman pemanggil)
 * - Tab visibility trigger (refresh saat kembali ke tab dengan cooldown, tanpa continuous polling)
 * - Debounced/Throttled refetch (mencegah klik berulang bertubi-tubi)
 *
 * @param {object} [options]
 * @param {Array<'vendors'|'statistics'|'logs'|'health'>} [options.scope] - Endpoint yang ingin di-fetch
 * @param {boolean} [options.autoRefreshOnFocus=true] - Refresh saat tab browser aktif kembali
 * @returns {Object} { vendors, statistics, logs, health, loading, error, refetch }
 */
export function useAdminData(options = {}) {
  const scope = options.scope || DEFAULT_SCOPE;
  const autoRefreshOnFocus = options.autoRefreshOnFocus !== false;

  const [vendors, setVendors] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const lastFetchTimeRef = useRef(0);
  const inProgressRef = useRef(false);

  /**
   * Fetch vendors dari client-service via gateway.
   */
  const fetchVendors = useCallback(async () => {
    try {
      const response = await apiGet("/v1/clients/vendors");
      setVendors(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      console.error("[useAdminData] Failed to fetch vendors:", err.message);
      setVendors([]);
      setError((prev) => prev || "Gagal memuat data vendor");
    }
  }, []);

  /**
   * Fetch statistics dari callback-log-service via gateway.
   */
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await apiGet("/v1/statistics");
      setStatistics(response?.stats || null);
    } catch (err) {
      console.error("[useAdminData] Failed to fetch statistics:", err.message);
      setStatistics(null);
    }
  }, []);

  /**
   * Fetch logs dari callback-log-service via gateway.
   */
  const fetchLogs = useCallback(async () => {
    try {
      const response = await apiGet("/v1/logs");
      setLogs(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      console.error("[useAdminData] Failed to fetch logs:", err.message);
      setLogs([]);
    }
  }, []);

  /**
   * Fetch health status dari gateway.
   */
  const fetchHealth = useCallback(async () => {
    try {
      const response = await apiGet("/health");
      setHealth(response || null);
    } catch (err) {
      console.error("[useAdminData] Failed to fetch health:", err.message);
      setHealth(null);
    }
  }, []);

  /**
   * Refetch data secara selektif sesuai scope yang diminta.
   * Dilengkapi guard in-progress untuk mencegah tumpang-tindih panggilan.
   */
  const refetch = useCallback(async (forced = false) => {
    const now = Date.now();
    // Throttle manual trigger: cegah spam klik lebih dari 1x dalam 800ms
    if (!forced && inProgressRef.current) return;
    if (!forced && now - lastFetchTimeRef.current < 800) return;

    inProgressRef.current = true;
    setLoading(true);
    setError(null);

    const promises = [];
    if (scope.includes("vendors")) promises.push(fetchVendors());
    if (scope.includes("statistics")) promises.push(fetchStatistics());
    if (scope.includes("logs")) promises.push(fetchLogs());
    if (scope.includes("health")) promises.push(fetchHealth());

    try {
      await Promise.allSettled(promises);
      lastFetchTimeRef.current = Date.now();
    } finally {
      setLoading(false);
      inProgressRef.current = false;
    }
  }, [scope, fetchVendors, fetchStatistics, fetchLogs, fetchHealth]);

  // Initial fetch saat component mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) {
        await refetch(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refetch]);

  // Tab Visibility Trigger: refresh data saat pengguna kembali ke tab
  // HANYA dipicu jika sudah lebih dari 30 detik sejak fetch terakhir (bukan polling buta)
  useEffect(() => {
    if (!autoRefreshOnFocus) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastFetchTimeRef.current;
        if (elapsed >= VISIBILITY_STALE_MS) {
          refetch(false);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoRefreshOnFocus, refetch]);

  return {
    vendors,
    statistics,
    logs,
    health,
    loading,
    error,
    refetch,
  };
}
