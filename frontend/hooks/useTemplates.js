"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

export function useTemplates(projectId) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const latestRequest = useRef(0);

  const fetchTemplates = useCallback(async () => {
    const requestId = ++latestRequest.current;
    if (!projectId) { setTemplates([]); setError(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const query = `?projectId=${encodeURIComponent(projectId)}`;
      const res = await apiGet(`/v1/clients/templates${query}`, { skipDedupe: true });
      if (requestId !== latestRequest.current) return;
      const d = res?.data;
      setTemplates(Array.isArray(d) ? d : d?.data || []);
    } catch (err) {
      if (requestId === latestRequest.current) setError(err.message);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [projectId]);

  const createTemplate = async (payload) => {
    const res = await apiPost("/v1/clients/templates", payload);
    if (res?.data) setTemplates((previous) => [res.data, ...previous.filter((item) => item.id !== res.data.id)]);
    void fetchTemplates();
    return res?.data;
  };  const updateTemplate = async (id, payload) => {
    const res = await apiPut(`/v1/clients/templates/${id}`, payload);
    if (res?.data) setTemplates((previous) => previous.map((item) => item.id === id ? res.data : item));
    void fetchTemplates();
    return res?.data;
  };  const deleteTemplate = async (id) => {
    const res = await apiDelete(`/v1/clients/templates/${id}`);
    setTemplates((previous) => previous.filter((item) => item.id !== id));
    void fetchTemplates();
    return res?.data;
  };

  const cancelPendingRequests = useCallback(() => { latestRequest.current++; }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchTemplates();
    })();
    return () => { cancelled = true; cancelPendingRequests(); };
  }, [fetchTemplates, cancelPendingRequests]);

  return { templates: templates.filter((template) => template.project_id === projectId), loading, error, createTemplate, updateTemplate, deleteTemplate, refetch: fetchTemplates };
}
