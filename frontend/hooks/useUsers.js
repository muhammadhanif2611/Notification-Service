"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

// Custom hook untuk manajemen akun pengguna oleh Admin melalui endpoint /v1/auth/users.
export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet("/v1/auth/users", { skipDedupe: true });
      const data = response?.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = async (payload) => {
    try {
      const response = await apiPost("/v1/auth/users", payload);
      return response.data;
    } finally {
      await fetchUsers();
    }
  };

  const setUserStatus = async (id, isActive) => {
    const response = await apiPut(`/v1/auth/users/${id}/status`, { is_active: isActive });
    await fetchUsers();
    return response.data;
  };

  const deleteUser = async (id) => {
    await apiDelete(`/v1/auth/users/${id}`);
    await fetchUsers();
  };

  const updateUser = async (id, payload) => {
    const response = await apiPut(`/v1/auth/users/${id}`, payload);
    await fetchUsers();
    return response.data;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchUsers();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    createUser,
    setUserStatus,
    deleteUser,
    updateUser,
    refetch: fetchUsers,
  };
}
