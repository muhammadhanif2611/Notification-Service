"use client";

import { useState, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const get = useCallback(async (path, options) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet(path, options);
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const post = useCallback(async (path, body, options) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost(path, body, options);
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, get, post, apiPut, apiDelete };
}
