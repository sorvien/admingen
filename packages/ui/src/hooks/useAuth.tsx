import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthUser } from '@blackwaves/admingen-types';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: () => void; // Redirects to login
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await fetch('/admin/api/_auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Auth check failed', e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = () => {
    // Navigate to /login page? Or handle modal?
    // For now, let's assume valid redirect
    window.location.href = '/admin/login'; 
  };

  const logout = async () => {
    try {
      await fetch('/admin/api/_auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/admin/login';
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
