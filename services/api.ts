import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Config } from '../constants/Config';

let currentBaseUrl = Config.DEFAULT_API_URL;

export const api: AxiosInstance = axios.create({
  baseURL: currentBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper for Secure storage on mobile vs asyncStorage on web
export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

// Initialize dynamic API base URL
export async function initializeApiClient() {
  const savedUrl = await AsyncStorage.getItem(Config.STORAGE_KEYS.API_URL);
  if (savedUrl) {
    currentBaseUrl = savedUrl;
    api.defaults.baseURL = savedUrl;
  } else {
    currentBaseUrl = Config.DEFAULT_API_URL;
    api.defaults.baseURL = Config.DEFAULT_API_URL;
  }
}

export async function setCustomApiUrl(newUrl: string) {
  currentBaseUrl = newUrl;
  api.defaults.baseURL = newUrl;
  await AsyncStorage.setItem(Config.STORAGE_KEYS.API_URL, newUrl);
}

export function getCurrentApiUrl(): string {
  return currentBaseUrl;
}

// Request interceptor: inject JWT Bearer token
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getSecureItem(Config.STORAGE_KEYS.AUTH_TOKEN);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Share one refresh request across concurrent expired-token responses.
let refreshInFlight: Promise<string> | null = null;
async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getSecureItem(Config.STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) throw new Error('Sign in again.');
  const response = await axios.post(`${currentBaseUrl}/auth/refresh`, { refreshToken }, { timeout: 15000 });
  const accessToken = response.data?.data?.accessToken;
  if (!accessToken) throw new Error('Invalid refresh response.');
  await setSecureItem(Config.STORAGE_KEYS.AUTH_TOKEN, accessToken);
  return accessToken;
}

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    const isAuthRequest = ['/auth/login', '/auth/refresh'].includes(originalRequest?.url);
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;
      try {
        if (!refreshInFlight) refreshInFlight = refreshAccessToken().finally(() => { refreshInFlight = null; });
        const accessToken = await refreshInFlight;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        // A network failure must not erase an otherwise usable refresh token.
        if (refreshError?.response?.status === 401 || !await getSecureItem(Config.STORAGE_KEYS.REFRESH_TOKEN)) {
          await deleteSecureItem(Config.STORAGE_KEYS.AUTH_TOKEN);
          await deleteSecureItem(Config.STORAGE_KEYS.REFRESH_TOKEN);
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
