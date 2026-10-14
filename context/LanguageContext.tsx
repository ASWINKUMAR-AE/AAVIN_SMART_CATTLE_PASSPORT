import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';
import enDict from '../locales/en.json';
import taDict from '../locales/ta.json';
import {
  IndicTransLang,
  toIndicTransCode,
  toAppLangCode,
  loadIndicTransCache,
  translateWithIndicTrans2,
  translateInstant as fastTranslateInstant,
  INDICTRANS2_MODELS,
  IndicTransResult,
} from '../services/indicTrans2Service';

export type LanguageCode = 'en' | 'ta';

export type TranslationParams = Record<string, string | number>;

interface LanguageContextType {
  language: LanguageCode;
  indicTransCode: IndicTransLang;
  modelName: string;
  isTranslating: boolean;
  setLanguage: (lang: LanguageCode | IndicTransLang) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  t: (
    keyPath: string,
    arg2?: string | TranslationParams,
    arg3?: string | TranslationParams
  ) => string;
  translateDynamic: (text: string, targetLang?: LanguageCode | IndicTransLang) => Promise<IndicTransResult>;
  translateInstant: (text: string, targetLang?: LanguageCode | IndicTransLang) => string;
}

const dictionaries: Record<LanguageCode, any> = {
  en: enDict,
  ta: taDict,
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  indicTransCode: 'eng_Latn',
  modelName: INDICTRANS2_MODELS.EN_TO_INDIC_DISTILLED,
  isTranslating: false,
  setLanguage: async () => {},
  toggleLanguage: async () => {},
  t: (keyPath: string, arg2?: string | TranslationParams, arg3?: string | TranslationParams) => {
    if (typeof arg2 === 'string') return arg2;
    if (typeof arg3 === 'string') return arg3;
    return keyPath;
  },
  translateDynamic: async (text: string) => ({
    originalText: text,
    translatedText: text,
    sourceLang: 'eng_Latn',
    targetLang: 'tam_Taml',
    model: INDICTRANS2_MODELS.EN_TO_INDIC_DISTILLED,
    fromCache: false,
    engine: 'IndicTrans2-FastJS',
  }),
  translateInstant: (text: string) => text,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    loadLanguagePreference();
    loadIndicTransCache();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(Config.STORAGE_KEYS.LANGUAGE);
      if (saved === 'en' || saved === 'ta' || saved === 'eng_Latn' || saved === 'tam_Taml') {
        setLanguageState(toAppLangCode(saved));
      }
    } catch (e) {
      console.warn('Failed to load language preference:', e);
    }
  };

  const setLanguage = async (newLang: LanguageCode | IndicTransLang) => {
    const appCode = toAppLangCode(newLang);
    setLanguageState(appCode);
    try {
      await AsyncStorage.setItem(Config.STORAGE_KEYS.LANGUAGE, appCode);
    } catch (e) {
      console.warn('Failed to save language preference:', e);
    }
  };

  const toggleLanguage = async () => {
    const next = language === 'en' ? 'ta' : 'en';
    await setLanguage(next);
  };

  // Helper to interpolate {key} or {{key}} in strings
  const interpolate = (str: string, params?: TranslationParams): string => {
    if (!params || typeof str !== 'string') return str;
    return Object.entries(params).reduce((acc, [k, v]) => {
      return acc.replace(new RegExp(`\\{\\{?\\s*${k}\\s*\\}\\}?`, 'g'), String(v));
    }, str);
  };

  // Structured key translation (from locales JSON) with parameter interpolation
  const t = (
    keyPath: string,
    arg2?: string | TranslationParams,
    arg3?: string | TranslationParams
  ): string => {
    const dict = dictionaries[language] || dictionaries.en;
    const parts = keyPath.split('.');
    let current: any = dict;

    let actualParams: TranslationParams | undefined;
    let actualFallback: string | undefined;

    if (typeof arg2 === 'object' && arg2 !== null) {
      actualParams = arg2;
      if (typeof arg3 === 'string') {
        actualFallback = arg3;
      }
    } else if (typeof arg2 === 'string') {
      actualFallback = arg2;
      if (typeof arg3 === 'object' && arg3 !== null) {
        actualParams = arg3;
      }
    }

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
            // Also try IndicTrans2 fast translator before giving up
            const raw = actualFallback || fastTranslateInstant(keyPath, language) || keyPath;
            return interpolate(raw, actualParams);
          }
        }
        if (typeof enCurrent === 'string') {
          const res = language === 'ta' ? fastTranslateInstant(enCurrent, 'tam_Taml') : enCurrent;
          return interpolate(res, actualParams);
        }
        return interpolate(actualFallback || keyPath, actualParams);
      }
    }

    const result = typeof current === 'string' ? current : (actualFallback || keyPath);
    return interpolate(result, actualParams);
  };

  // Dynamic sentence / phrase translation powered by IndicTrans2
  const translateDynamic = async (
    text: string,
    targetLang?: LanguageCode | IndicTransLang
  ): Promise<IndicTransResult> => {
    const tgt = targetLang ? toIndicTransCode(targetLang) : toIndicTransCode(language);
    const src = tgt === 'tam_Taml' ? 'eng_Latn' : 'tam_Taml';

    setIsTranslating(true);
    try {
      return await translateWithIndicTrans2(text, {
        sourceLang: src,
        targetLang: tgt,
      });
    } finally {
      setIsTranslating(false);
    }
  };

  // Synchronous translation for fast UI inline rendering
  const translateInstant = (
    text: string,
    targetLang?: LanguageCode | IndicTransLang
  ): string => {
    const tgt = targetLang ? toIndicTransCode(targetLang) : toIndicTransCode(language);
    return fastTranslateInstant(text, tgt);
  };

  const indicTransCode = toIndicTransCode(language);
  const modelName = language === 'ta'
    ? INDICTRANS2_MODELS.EN_TO_INDIC_DISTILLED
    : INDICTRANS2_MODELS.INDIC_TO_EN_DISTILLED;

  return (
    <LanguageContext.Provider
      value={{
        language,
        indicTransCode,
        modelName,
        isTranslating,
        setLanguage,
        toggleLanguage,
        t,
        translateDynamic,
        translateInstant,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
