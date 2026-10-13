import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DemoUser, UserRole } from '../types/aavin';
import { SEED_DEMO_USERS } from '../data/seedData';
import { api, setSecureItem, deleteSecureItem, getSecureItem, initializeApiClient } from '../services/api';
import { Config } from '../constants/Config';
import { apiErrorMessage, BackendUser, mapAccount, mapFarmer, mapSociety } from '../services/accountMapping';
import { useAavinStore } from '../store/AavinStoreContext';

const AUTH_USER_KEY = '@aavin_auth_user_v2';

export interface LoginResult {
  success: boolean;
  role?: UserRole;
  user?: DemoUser;
  error?: string;
}

interface AuthContextType {
  user: DemoUser | null;
  activeRole: UserRole | null;
  isLoading: boolean;
  token: string | null;
  login: (usernameOrPhone: string, passwordPlain: string) => Promise<LoginResult>;
  loginAsDemoUser: (userId: string) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  updateLanguage: (lang: 'en' | 'ta') => Promise<void>;
  logout: () => Promise<void>;
  demoUsers: DemoUser[];
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  activeRole: null,
  isLoading: true,
  token: null,
  login: async () => ({ success: false, error: 'Not initialized' }),
  loginAsDemoUser: async () => {},
  switchRole: async () => {},
  updateLanguage: async () => {},
  logout: async () => {},
  demoUsers: SEED_DEMO_USERS,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { isLoading: storeLoading, cacheFarmer, cacheSociety } = useAavinStore();

  const clearSession = useCallback(async () => {
    setUser(null);
    setActiveRole(null);
    setToken(null);
    await Promise.all([
      deleteSecureItem(Config.STORAGE_KEYS.AUTH_TOKEN),
      deleteSecureItem(Config.STORAGE_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem(AUTH_USER_KEY),
    ]);
  }, []);

  const applyAccount = useCallback(async (account: BackendUser) => {
    const appUser = mapAccount(account);
    if (account.role === 'society') cacheSociety(mapSociety(account));
    if (account.role === 'farmer') {
      cacheFarmer(mapFarmer(account));
      if (account.parent) cacheSociety(mapSociety(account.parent));
    }
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(appUser));
    setUser(appUser);
    setActiveRole(appUser.role);
    setToken(await getSecureItem(Config.STORAGE_KEYS.AUTH_TOKEN));
    return appUser;
  }, [cacheFarmer, cacheSociety]);

  useEffect(() => {
    if (storeLoading) return;
    let mounted = true;
    const bootstrap = async () => {
      try {
        await initializeApiClient();
        const savedToken = await getSecureItem(Config.STORAGE_KEYS.AUTH_TOKEN);
        if (!savedToken) {
          await clearSession();
          return;
        }
        const response = await api.get('/auth/me');
        if (mounted) await applyAccount(response.data.data.user);
      } catch (error: any) {
        if (error?.response?.status === 401) await clearSession();
        else {
          // Stored demo users and cached sessions are never proof of authentication.
          setUser(null);
          setActiveRole(null);
          setToken(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    bootstrap();
    return () => { mounted = false; };
  }, [storeLoading, applyAccount, clearSession]);

  const login = async (phone: string, passwordPlain: string): Promise<LoginResult> => {
    if (!phone.trim() || !passwordPlain) return { success: false, error: 'Phone number and password are required.' };
    try {
      await initializeApiClient();
      await clearSession();
      const response = await api.post('/auth/login', { phone: phone.trim(), password: passwordPlain });
      const { accessToken, refreshToken, user: account } = response.data.data;
      if (!accessToken || !refreshToken) throw new Error('Invalid login response.');
      await setSecureItem(Config.STORAGE_KEYS.AUTH_TOKEN, accessToken);
      await setSecureItem(Config.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      const appUser = await applyAccount(account);
      return { success: true, role: appUser.role, user: appUser };
    } catch (error) {
      await clearSession();
      return { success: false, error: apiErrorMessage(error) };
    }
  };

  const loginAsDemoUser = async (userId: string) => {
    const selected = SEED_DEMO_USERS.find(item => item.id === userId || item.username === userId);
    if (!selected) throw new Error('Account not found.');
    const result = await login(selected.phone, 'Password@123');
    if (!result.success) throw new Error(result.error);
  };

  const switchRole = async (role: UserRole) => {
    if (role !== activeRole) throw new Error('Log in to an account with the requested role.');
  };

  const updateLanguage = async (lang: 'en' | 'ta') => {
    if (user) {
      const updated = { ...user, preferredLanguage: lang };
      setUser(updated);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
    }
  };

  /**
   * Real production logout: cleans tokens, revokes session, clears state
   */
  const logout = async () => {
    try {
      const refreshToken = await getSecureItem(Config.STORAGE_KEYS.REFRESH_TOKEN);
      await api.post('/auth/logout', { refreshToken }).catch(() => {});
    } catch {
      // Ignore network errors on logout
    } finally {
      await clearSession();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        isLoading,
        token,
        login,
        loginAsDemoUser,
        switchRole,
        updateLanguage,
        logout,
        demoUsers: SEED_DEMO_USERS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
