"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "@/lib/api";

export function useApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/api/api-keys");
      setKeys(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createKey = async (label, mode) => {
    setLoading(true);
    try {
      const res = await apiPost("/api/api-keys", { label, mode });
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
      const res = await apiDelete(`/api/api-keys/${id}`);
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
    fetchKeys();
  }, [fetchKeys]);

  return { keys, loading, error, createKey, deactivateKey, refetch: fetchKeys };
}

