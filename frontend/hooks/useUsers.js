"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

/**
 * Custom hook untuk manajemen akun client oleh admin.
 * Endpoint lewat gateway: /v1/auth/users (JWT admin required).
 * 
 * @returns {Object} { users, loading, error, createUser, setUserStatus, deleteUser, updateUser, refetch }
 */
export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch semua users dari auth-service.
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet("/v1/auth/users");
      const data = response?.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Buat user baru.
   * @param {Object} payload - { name, email, password, role, project_name, quota_daily, rate_limit }
   * @returns {Promise<Object>} Created user
   */
  const createUser = async (payload) => {
    const response = await apiPost("/v1/auth/users", payload);
    await fetchUsers();
    return response.data;
  };

  /**
   * Update status aktif user (suspend/activate).
   * @param {string} id - User ID
   * @param {boolean} isActive - Status aktif
   * @returns {Promise<Object>} Updated user
   */
  const setUserStatus = async (id, isActive) => {
    const response = await apiPut(`/v1/auth/users/${id}/status`, { is_active: isActive });
    await fetchUsers();
    return response.data;
  };

  /**
   * Hapus user.
   * @param {string} id - User ID
   */
  const deleteUser = async (id) => {
    await apiDelete(`/v1/auth/users/${id}`);
    await fetchUsers();
  };

  /**
   * Update user.
   * @param {string} id - User ID
   * @param {Object} payload - { name, email, role, project_name, quota_daily, rate_limit, password? }
   * @returns {Promise<Object>} Updated user
   */
  const updateUser = async (id, payload) => {
    const response = await apiPut(`/v1/auth/users/${id}`, payload);
    await fetchUsers();
    return response.data;
  };

  // Initial fetch saat component mount
  useEffect(() => {
    let cancelled = false;
    
    (async () => {
      if (!cancelled) {
        await fetchUsers();
      }
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
    refetch: fetchUsers 
  };
}