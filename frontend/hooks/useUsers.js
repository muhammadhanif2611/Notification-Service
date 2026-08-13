"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

/**
 * useUsers — Hook untuk manajemen akun client oleh admin.
 * Endpoint lewat gateway: /v1/auth/users (JWT admin required).
 */
export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/v1/auth/users");
      const d = res?.data;
      setUsers(Array.isArray(d) ? d : []);
    } catch (err) {
      setError(err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = async (payload) => {
    const res = await apiPost("/v1/auth/users", payload);
    await fetchUsers();
    return res.data;
  };

  const setUserStatus = async (id, isActive) => {
    const res = await apiPut(`/v1/auth/users/${id}/status`, { is_active: isActive });
    await fetchUsers();
    return res.data;
  };

  const deleteUser = async (id) => {
    await apiDelete(`/v1/auth/users/${id}`);
    await fetchUsers();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchUsers();
    })();
    return () => { cancelled = true; };
  }, [fetchUsers]);

  return { users, loading, error, createUser, setUserStatus, deleteUser, refetch: fetchUsers };
}