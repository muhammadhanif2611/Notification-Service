"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook untuk men-debounce perubahan value (misalnya query input pencarian).
 * Value baru hanya diteruskan setelah user berhenti mengetik selama `delay` ms.
 *
 * @param {any} value - Nilai yang diamati
 * @param {number} [delay=300] - Jeda waktu dalam ms
 * @returns {any} Debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook untuk membuat debounced function callback.
 * Menjamin fungsi tidak dipanggil berulang-ulang saat trigger cepat terjadi.
 *
 * @param {Function} callback - Callback yang akan di-debounce
 * @param {number} [delay=300] - Jeda waktu dalam ms
 * @returns {Function & { cancel: Function }} Debounced callback
 */
export function useDebouncedCallback(callback, delay = 300) {
  const callbackRef = useRef(callback);
  const timerRef = useRef(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debounced = useCallback((...args) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      callbackRef.current(...args);
    }, delay);
  }, [delay]);

  debounced.cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return debounced;
}

/**
 * Hook untuk throttle callback (eksekusi paling banyak 1x per `interval` ms).
 * Sangat berguna untuk trigger refresh/sinkronisasi agar tidak di-spam user.
 *
 * @param {Function} callback
 * @param {number} [interval=1000]
 * @returns {Function}
 */
export function useThrottledCallback(callback, interval = 1000) {
  const lastExecuted = useRef(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastExecuted.current >= interval) {
      lastExecuted.current = now;
      callbackRef.current(...args);
    }
  }, [interval]);
}
