"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

// Hook manajemen siklus hidup API Key (list, create, regenerate, deactivate, update, delete) per project.
export function useApiKeys(projectId = null) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchKeys = useCallback(async () => {
    if (!projectId) {
      setKeys([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const query = `?projectId=${encodeURIComponent(projectId)}`;
      const res = await apiGet(`/v1/clients/api-keys${query}`, { skipDedupe: true });
      const d = res?.data;
      let list = Array.isArray(d) ? d : d?.data || [];
      list = list.filter((k) => k.project_id === projectId);
      setKeys(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createKey = async (projectId, name, environment) => {
    setLoading(true);
    try {
      const res = await apiPost("/v1/clients/api-keys", { projectId, name, environment });
      await fetchKeys();
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const regenerateKey = async (id) => {
    setLoading(true);
    try {
      const res = await apiPost(`/v1/clients/api-keys/${id}/regenerate`);
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
    return () => {
      cancelled = true;
    };
  }, [fetchKeys]);

  return { keys, loading, error, createKey, regenerateKey, deactivateKey, updateKey, deleteKey, refetch: fetchKeys };
}
