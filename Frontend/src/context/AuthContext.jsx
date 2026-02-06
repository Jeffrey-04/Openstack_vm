import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  const updateAuth = (newToken, newUser) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
      setToken(newToken);
    } else {
      localStorage.removeItem('token');
      setToken(null);
    }
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
    } else {
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const login = async (email, password) => {
    const data = await apiService.login(email, password);
    updateAuth(data.token, data.user);
    return data;
  };

  const register = async (payload) => {
    const data = await apiService.register(payload);
    updateAuth(data.token, data.user);
    return data;
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (_) {}
    updateAuth(null, null);
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    apiService
      .getMe()
      .then((data) => {
        if (data.user) setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        updateAuth(null, null);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    const onLogout = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth-logout', onLogout);
    return () => window.removeEventListener('auth-logout', onLogout);
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
