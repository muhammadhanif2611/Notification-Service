"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "@/lib/api";

/**
 * useProjects — Mengambil daftar project (client_apps) milik pengguna.
 * Dipakai untuk memilih konteks project pada halaman Templates & Broadcast.
 * Endpoint: GET /v1/clients/projects (lewat gateway, JWT).
 */
export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/v1/clients/projects");
      const d = res?.data;
      setProjects(Array.isArray(d) ? d : d?.data || []);
    } catch (err) {
      setError(err.message);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchProjects();
    })();
    return () => { cancelled = true; };
  }, [fetchProjects]);

  /**
   * Membuat project baru.
   * @param {{name:string, slug:string, description?:string}} payload
   */
  const createProject = async (payload) => {
    const res = await apiPost("/v1/clients/projects", payload);
    await fetchProjects();
    return res.data;
  };

  return { projects, loading, error, createProject, refetch: fetchProjects };
}
