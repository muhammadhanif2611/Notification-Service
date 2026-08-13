"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet } from "@/lib/api";

export function useMessages(initialFilters = {}) {
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMessages = useCallback(async (filters = initialFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(filters).toString();
      const res = await apiGet(`/api/messages?${params}`);
      setMessages(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [initialFilters]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchMessages();
    })();
    return () => { cancelled = true; };
  }, [fetchMessages]);

  return { messages, total, loading, error, refetch: fetchMessages };
}
