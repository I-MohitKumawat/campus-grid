'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext({
  user: null,
  loading: true,
  logout: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/session', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.data) {
        setUser(data.data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Session fetch error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/v1/auth/session', { method: 'DELETE' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      window.location.href = '/sign-in';
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshSession: fetchSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
