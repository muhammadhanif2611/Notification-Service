"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export function useAdminResource(path, initialData = null) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({ data: initialData, path: null, version: -1, error: null });
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    apiGet(path, { skipDedupe: true }).then((response) => {
      if (!cancelled) setResult({ data: response.data, path, version, error: null });
    }).catch((error) => {
      if (!cancelled) setResult((previous) => ({ ...previous, path, version, error: error.message }));
    });
    return () => { cancelled = true; };
  }, [path, version]);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  const loading = Boolean(path) && (result.path !== path || result.version !== version);
  return { data: result.data, loading, error: loading ? null : result.error, refresh };
}
