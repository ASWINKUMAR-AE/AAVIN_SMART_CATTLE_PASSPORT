import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';
import enDict from '../locales/en.json';
import taDict from '../locales/ta.json';

export type LanguageCode = 'en' | 'ta';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  t: (keyPath: string, fallback?: string) => string;
}

const dictionaries: Record<LanguageCode, any> = {
  en: enDict,
  ta: taDict,
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: async () => {},
  toggleLanguage: async () => {},
  t: (keyPath: string, fallback?: string) => fallback || keyPath,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(Config.STORAGE_KEYS.LANGUAGE);
      if (saved === 'en' || saved === 'ta') {
        setLanguageState(saved);
      }
    } catch (e) {
      console.warn('Failed to load language preference:', e);
    }
  };

  const setLanguage = async (newLang: LanguageCode) => {
    setLanguageState(newLang);
    try {
      await AsyncStorage.setItem(Config.STORAGE_KEYS.LANGUAGE, newLang);
    } catch (e) {
      console.warn('Failed to save language preference:', e);
    }
  };

  const toggleLanguage = async () => {
    const next = language === 'en' ? 'ta' : 'en';
    await setLanguage(next);
  };

  const t = (keyPath: string, fallback?: string): string => {
    const dict = dictionaries[language] || dictionaries.en;
    const parts = keyPath.split('.');
    let current: any = dict;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // Fallback to English if translation is missing in Tamil
        let enCurrent: any = dictionaries.en;
        for (const p of parts) {
          if (enCurrent && typeof enCurrent === 'object' && p in enCurrent) {
            enCurrent = enCurrent[p];
          } else {
            return fallback || keyPath;
          }
        }
        return typeof enCurrent === 'string' ? enCurrent : (fallback || keyPath);
      }
    }

    return typeof current === 'string' ? current : (fallback || keyPath);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
