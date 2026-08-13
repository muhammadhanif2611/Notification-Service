"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet } from "@/lib/api";

/**
 * useAdminData — Hook data admin: vendors, queue stats, service health, logs, statistics.
 * Endpoint lewat gateway: /v1/clients/vendors, /v1/logs, /v1/statistics, /health.
 */
export function useAdminData() {
  const [vendors, setVendors] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await apiGet("/v1/clients/vendors");
      setVendors(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch vendors:", err.message);
      setVendors([]);
    }
  }, []);

  const fetchStatistics = useCallback(async () => {
    try {
      const res = await apiGet("/v1/statistics");
      setStatistics(res?.stats || null);
    } catch (err) {
      console.error("Failed to fetch statistics:", err.message);
      setStatistics(null);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await apiGet("/v1/logs");
      setLogs(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch logs:", err.message);
      setLogs([]);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await apiGet("/health");
      setHealth(res || null);
    } catch (err) {
      console.error("Failed to fetch health:", err.message);
      setHealth(null);
    }
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([
      fetchVendors(),
      fetchStatistics(),
      fetchLogs(),
      fetchHealth(),
    ]);
    setLoading(false);
  }, [fetchVendors, fetchStatistics, fetchLogs, fetchHealth]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await refetch();
    })();
    return () => { cancelled = true; };
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
