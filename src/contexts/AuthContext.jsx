import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, login as apiLogin, logout as apiLogout, me as apiMe, getAccessToken, onAuthLogout } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function hydrate() {
      try {
        const token = getAccessToken();
        if (token) {
          const u = await apiMe();
          setUser(u || null);
          setIsAuthenticated(!!u);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }
    hydrate();
  }, []);

  useEffect(() => {
    const off = onAuthLogout(() => {
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login', { replace: true });
    });
    return off;
  }, [navigate]);

  async function login(username, password) {
    await apiLogin(username, password);
    const u = await apiMe().catch(() => null);
    setUser(u);
    setIsAuthenticated(!!u);
    navigate('/', { replace: true });
  }

  async function logout() {
    await apiLogout().catch(() => {});
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login', { replace: true });
  }

  const value = useMemo(() => ({ user, isAuthenticated, loading, login, logout }), [user, isAuthenticated, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
