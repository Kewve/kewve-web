'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  businessName?: string;
  country?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    businessName?: string;
    country?: string;
  }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      if (response.success) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      // Not authenticated
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authAPI.login({ email, password });
    if (response.success) {
      setUser(response.data.user);
      // Don't redirect here, let the component handle it
    } else {
      throw new Error('Login failed');
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    name: string;
    businessName?: string;
    country?: string;
  }) => {
    const response = await authAPI.register(data);
    if (response.success) {
      setUser(response.data.user);
      router.push('/export-readiness/dashboard');
    } else {
      throw new Error('Registration failed');
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
