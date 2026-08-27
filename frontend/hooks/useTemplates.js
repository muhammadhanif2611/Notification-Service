"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

/**
 * useTemplates — Kelola template pesan (buat + lihat) untuk sebuah project.
 * Pembuatan template lewat dashboard (JWT), langsung bisa digunakan tanpa persetujuan admin.
 * @param {string|null} projectId - ID project yang dipilih
 */
export function useTemplates(projectId) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = projectId ? `?projectId=${projectId}` : "";
      const res = await apiGet(`/v1/clients/templates${query}`);
      const d = res?.data;
      setTemplates(Array.isArray(d) ? d : d?.data || []);
    } catch (err) {
      setError(err.message);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createTemplate = async (payload) => {
    const res = await apiPost("/v1/clients/templates", payload);
    await fetchTemplates();
    return res?.data;
  };

  // Edit isi template
  const updateTemplate = async (id, payload) => {
    const res = await apiPut(`/v1/clients/templates/${id}`, payload);
    await fetchTemplates();
    return res?.data;
  };

  // Hapus template
  const deleteTemplate = async (id) => {
    const res = await apiDelete(`/v1/clients/templates/${id}`);
    await fetchTemplates();
    return res?.data;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchTemplates();
    })();
    return () => { cancelled = true; };
  }, [fetchTemplates]);

  return { templates, loading, error, createTemplate, updateTemplate, deleteTemplate, refetch: fetchTemplates };
}
