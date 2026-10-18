
const getDefaultApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  return 'https://aavin.todayworld.in/api/v1';
};

export const Config = {
  DEFAULT_API_URL: getDefaultApiUrl(),
  DEFAULT_OCR_URL: process.env.EXPO_PUBLIC_OCR_API_URL || 'http://106.51.21.4/api/v1/ocr/table',
  STORAGE_KEYS: {
    API_URL: 'aavin_api_url',
    AUTH_TOKEN: 'aavin_auth_token',
    REFRESH_TOKEN: 'aavin_refresh_token',
    USER_DATA: 'aavin_user_data',
    OFFLINE_QUEUE: 'aavin_offline_queue',
    LANGUAGE: 'aavin_language_pref',
    THEME_MODE: 'aavin_theme_mode',
  },
  APP_VERSION: '1.0.0',
  MADURAI_ECOSYSTEM_NAME: 'Aavin Madurai District Milk Union',
};
