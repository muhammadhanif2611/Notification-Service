"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet } from "@/lib/api";

/**
 * Custom hook untuk mengambil data admin dari berbagai microservice.
 * Menggunakan Promise.all untuk parallel fetching dan error handling yang robust.
 * 
 * @returns {Object} { vendors, statistics, logs, health, loading, error, refetch }
 */
export function useAdminData() {
  const [vendors, setVendors] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch vendors dari client-service via gateway.
   * Endpoint: GET /v1/clients/vendors
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
   * Endpoint: GET /v1/statistics
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
   * Endpoint: GET /v1/logs
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
   * Endpoint: GET /health
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
   * Refetch semua data secara parallel.
   * Menggunakan Promise.allSettled agar satu kegagalan tidak menghentikan yang lain.
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    await Promise.allSettled([
      fetchVendors(),
      fetchStatistics(),
      fetchLogs(),
      fetchHealth(),
    ]);
    
    setLoading(false);
  }, [fetchVendors, fetchStatistics, fetchLogs, fetchHealth]);

  // Initial fetch saat component mount
  useEffect(() => {
    let cancelled = false;
    
    (async () => {
      if (!cancelled) {
        await refetch();
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [refetch]);

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
