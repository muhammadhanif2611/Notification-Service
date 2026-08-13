"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPut } from "@/lib/api";

export function useApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/v1/clients/api-keys");
      const d = res?.data;
      setKeys(Array.isArray(d) ? d : d?.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createKey = async (label, mode) => {
    setLoading(true);
    try {
      const res = await apiPost("/v1/clients/api-keys", { label, mode });
      await fetchKeys();
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deactivateKey = async (id) => {
    setLoading(true);
    try {
      const res = await apiPut(`/v1/clients/api-keys/${id}/deactivate`);
      await fetchKeys();
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchKeys();
    })();
    return () => { cancelled = true; };
  }, [fetchKeys]);

  return { keys, loading, error, createKey, deactivateKey, refetch: fetchKeys };
}

