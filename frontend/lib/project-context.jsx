"use client";

// =============================================================================
// Project Context (Frontend)
// Menyimpan project yang sedang aktif/dipilih secara global di area client.
// Semua halaman (API Key, Template, Broadcast, dll.) ter-scoping ke project ini
// sehingga datanya berbeda-beda per project. Pilihan disimpan di localStorage.
// =============================================================================

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiGet } from "@/lib/api";

const STORAGE_KEY = "ngw_active_project";
const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet("/v1/clients/projects");
      const d = res?.data;
      const list = Array.isArray(d) ? d : d?.data || [];
      setProjects(list);
      return list;
    } catch {
      setProjects([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Inisialisasi: muat daftar project + pulihkan pilihan dari localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchProjects();
      if (cancelled) return;
      const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const stillExists = list.find((p) => p.id === saved);
      const fallback = stillExists ? saved : list[0]?.id || "";
      setActiveProjectId(fallback);
    })();
    return () => { cancelled = true; };
  }, [fetchProjects]);

  const selectProject = useCallback((id) => {
    setActiveProjectId(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  const value = {
    projects,
    activeProject,
    activeProjectId,
    selectProject,
    loading,
    refetch: fetchProjects,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjectContext harus dipakai di dalam <ProjectProvider>");
  return ctx;
}
