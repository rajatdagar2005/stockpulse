import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { UserProfile } from '../types/index';

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
  role?: 'OWNER' | 'STAFF';
  shopName?: string;
  shopLocation?: string;
  shopId?: number;
  staffJoinCode?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    nameOrParams: string | RegisterParams,
    email?: string,
    password?: string,
    role?: 'OWNER' | 'STAFF',
    shopName?: string,
    shopLocation?: string,
    shopId?: number,
    staffJoinCode?: string
  ) => Promise<void>;
  logout: () => void;
  loginAsDemo: (role: 'OWNER' | 'STAFF') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('stockpulse_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('stockpulse_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verifyAuth() {
      const storedToken = localStorage.getItem('stockpulse_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data?.data?.user) {
            setUser(res.data.data.user);
            localStorage.setItem('stockpulse_user', JSON.stringify(res.data.data.user));
          }
        } catch {
          // Token invalid or expired
          localStorage.removeItem('stockpulse_token');
          localStorage.removeItem('stockpulse_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    }

    verifyAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.success) {
      const { token: receivedToken, user: receivedUser } = res.data.data;
      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('stockpulse_token', receivedToken);
      localStorage.setItem('stockpulse_user', JSON.stringify(receivedUser));
    }
  };

  const register = async (
    nameOrParams: string | RegisterParams,
    email?: string,
    password?: string,
    role = 'OWNER' as 'OWNER' | 'STAFF',
    shopName?: string,
    shopLocation?: string,
    shopId?: number,
    staffJoinCode?: string
  ) => {
    let payload: any;
    if (typeof nameOrParams === 'object') {
      payload = nameOrParams;
    } else {
      payload = {
        name: nameOrParams,
        email,
        password,
        role,
        shopName,
        shopLocation,
        shopId,
        staffJoinCode,
      };
    }

    const res = await api.post('/auth/register', payload);
    if (res.data?.success) {
      const { token: receivedToken, user: receivedUser } = res.data.data;
      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('stockpulse_token', receivedToken);
      localStorage.setItem('stockpulse_user', JSON.stringify(receivedUser));
    }
  };

  const logout = () => {
    localStorage.removeItem('stockpulse_token');
    localStorage.removeItem('stockpulse_user');
    setToken(null);
    setUser(null);
  };

  const loginAsDemo = async (role: 'OWNER' | 'STAFF') => {
    const credentials =
      role === 'OWNER'
        ? { email: 'demo@stockpulse.com', password: 'Demo@12345' }
        : { email: 'staff@stockpulse.com', password: 'Staff@12345' };
    await login(credentials.email, credentials.password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        loginAsDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
