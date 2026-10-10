import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, getSecureItem, setSecureItem, deleteSecureItem, initializeApiClient } from '../services/api';
import { Config } from '../constants/Config';

export type UserRole = 'admin' | 'farmer' | 'veterinary' | 'collection_operator' | 'transport_vendor';

export interface User {
  id: string;
  username: string;
  phone: string;
  email?: string | null;
  fullName: string;
  status: string;
  roles: UserRole[];
  preferredLanguage: 'en' | 'ta';
  farmerIdCode?: string | null;
  primaryCentreId?: string | null;
  vetLicenseNumber?: string | null;
  vendorCode?: string | null;
}

interface AuthContextType {
  user: User | null;
  activeRole: UserRole | null;
  isLoading: boolean;
  login: (usernameOrPhone: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  setActiveRole: (role: UserRole) => void;
  updateLanguage: (lang: 'en' | 'ta') => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  activeRole: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  setActiveRole: () => {},
  updateLanguage: async () => {},
  refreshUserProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const bootstrapAuth = async () => {
    try {
      await initializeApiClient();
      const token = await getSecureItem(Config.STORAGE_KEYS.AUTH_TOKEN);
      const savedUserStr = await AsyncStorage.getItem(Config.STORAGE_KEYS.USER_DATA);

      if (token && savedUserStr) {
        const parsedUser: User = JSON.parse(savedUserStr);
        setUser(parsedUser);
        setActiveRole(parsedUser.roles[0] || 'farmer');

        // Verify token in background
        api.get('/auth/me').then((res) => {
          if (res.data?.data?.user) {
            setUser(res.data.data.user);
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Auth bootstrap error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (usernameOrPhone: string, password: string) => {
    const res = await api.post('/auth/login', { usernameOrPhone, password });
    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Login failed');
    }

    const { accessToken, refreshToken, user: loggedInUser } = res.data.data;
    await setSecureItem(Config.STORAGE_KEYS.AUTH_TOKEN, accessToken);
    if (refreshToken) {
      await setSecureItem(Config.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    await AsyncStorage.setItem(Config.STORAGE_KEYS.USER_DATA, JSON.stringify(loggedInUser));

    setUser(loggedInUser);
    setActiveRole(loggedInUser.roles[0] || 'farmer');
  };

  const register = async (data: any) => {
    try {
      const res = await api.post('/auth/register', data);
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Registration failed');
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout').catch(() => {});
    } finally {
      await deleteSecureItem(Config.STORAGE_KEYS.AUTH_TOKEN);
      await deleteSecureItem(Config.STORAGE_KEYS.REFRESH_TOKEN);
      await AsyncStorage.removeItem(Config.STORAGE_KEYS.USER_DATA);
      setUser(null);
      setActiveRole(null);
    }
  };

  const updateLanguage = async (lang: 'en' | 'ta') => {
    if (user) {
      const updated = { ...user, preferredLanguage: lang };
      setUser(updated);
      await AsyncStorage.setItem(Config.STORAGE_KEYS.USER_DATA, JSON.stringify(updated));
      await api.patch('/farmers/me', { preferredLanguage: lang }).catch(() => {});
    }
  };

  const refreshUserProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.data?.user) {
        setUser(res.data.data.user);
        await AsyncStorage.setItem(Config.STORAGE_KEYS.USER_DATA, JSON.stringify(res.data.data.user));
      }
    } catch (e) {
      console.warn('Failed to refresh user profile:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        isLoading,
        login,
        register,
        logout,
        setActiveRole,
        updateLanguage,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
