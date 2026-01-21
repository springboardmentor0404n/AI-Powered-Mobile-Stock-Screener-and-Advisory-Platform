import React, { createContext, useState, useContext, useEffect } from 'react';
import { storage } from '../utils/storage';
import { api } from '../utils/api';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (name: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await storage.getItem('authToken');
      if (token) {
        const data = await api.get('/api/auth/me', token);
        setUser(data);
      }
    } catch (error: any) {
      console.log('Auth check failed:', error);
      // Only logout if token is explicitly invalid (401)
      if (error.message?.includes('401') || error.message?.includes('Invalid')) {
        await storage.removeItem('authToken');
        setUser(null);
      }
      // For other errors (network, 500), keep the token and let user try again later
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await api.post('/api/auth/login', { email, password });
      const { access_token, user: userData } = data;
      await storage.setItem('authToken', access_token);
      setUser(userData);
    } catch (error: any) {
      const message = error.message || 'Login failed';
      throw new Error(message);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const data = await api.post('/api/auth/signup', { name, email, password });
      const { access_token, user: userData } = data;
      await storage.setItem('authToken', access_token);
      setUser(userData);
    } catch (error: any) {
      const message = error.message || 'Signup failed';
      throw new Error(message);
    }
  };

  const logout = async () => {
    await storage.removeItem('authToken');
    setUser(null);
  };

  const updateUser = async (name: string) => {
    try {
      const token = await storage.getItem('authToken');
      if (!token) throw new Error('Not authenticated');

      const response = await api.put('/api/auth/profile', { name }, token);
      if (response.user) {
        setUser(response.user);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update profile');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        updateUser,
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
