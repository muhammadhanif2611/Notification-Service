"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

export function useApiKeys(projectId = null) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/v1/clients/api-keys");
      const d = res?.data;
      let list = Array.isArray(d) ? d : d?.data || [];
      // Scoping per project: hanya tampilkan key milik project aktif
      if (projectId) list = list.filter((k) => k.project_id === projectId);
      setKeys(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  /**
   * Membuat API Key baru.
   * @param {string} projectId - UUID project pemilik key
   * @param {string} name - Label key (mis. "Production Key")
   * @param {string} environment - "production" | "sandbox"
   * @returns {Promise<{rawApiKey: string, apiKeyInfo: object}>}
   */
  const createKey = async (projectId, name, environment) => {
    setLoading(true);
    try {
      const res = await apiPost("/v1/clients/api-keys", { projectId, name, environment });
      await fetchKeys();
      return res.data; // { rawApiKey, apiKeyInfo }
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

  // Edit label/nama API Key
  const updateKey = async (id, name) => {
    try {
      const res = await apiPut(`/v1/clients/api-keys/${id}`, { name });
      await fetchKeys();
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Hapus API Key secara permanen
  const deleteKey = async (id) => {
    try {
      const res = await apiDelete(`/v1/clients/api-keys/${id}`);
      await fetchKeys();
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchKeys();
    })();
    return () => { cancelled = true; };
  }, [fetchKeys]);

  return { keys, loading, error, createKey, deactivateKey, updateKey, deleteKey, refetch: fetchKeys };
}

