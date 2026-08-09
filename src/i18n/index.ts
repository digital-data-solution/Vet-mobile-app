/**
 * i18n/index.ts — app internationalisation.
 *
 * Built for scale: the app ships in English but a business in Riyadh, Paris or
 * São Paulo can switch the whole Business Suite to their language. Device locale
 * is auto-detected on first run (expo-localization); the user's explicit choice
 * is remembered (AsyncStorage). English is always the fallback, so a missing
 * translation degrades gracefully instead of showing a blank.
 *
 * Adding a language later is JS-only (drop a resource block here) and ships over
 * the air — no native rebuild — because the native locale module is already in
 * the binary.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en';
import ar from './locales/ar';
import fr from './locales/fr';
import es from './locales/es';
import pt from './locales/pt';
import zh from './locales/zh';

export const LANGUAGES: { code: string; label: string; rtl?: boolean }[] = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية', rtl: true },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'zh', label: '中文' },
];

const RTL_LANGS = new Set(LANGUAGES.filter((l) => l.rtl).map((l) => l.code));
const STORAGE_KEY = 'app.language';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  fr: { translation: fr },
  es: { translation: es },
  pt: { translation: pt },
  zh: { translation: zh },
};

function deviceLanguage(): string {
  try {
    const tag = getLocales?.()?.[0]?.languageCode || 'en';
    return resources[tag as keyof typeof resources] ? tag : 'en';
  } catch { return 'en'; }
}

function applyDirection(lng: string) {
  const shouldRTL = RTL_LANGS.has(lng);
  try {
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== shouldRTL) I18nManager.forceRTL(shouldRTL);
  } catch { /* no-op on web */ }
}

// Synchronous init with the device language so the first render is localized;
// the stored preference (if any) is applied right after.
i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});
applyDirection(i18n.language);

AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
  if (saved && saved !== i18n.language && resources[saved as keyof typeof resources]) {
    i18n.changeLanguage(saved);
    applyDirection(saved);
  }
}).catch(() => {});

/** Change language app-wide and remember it. Arabic flips layout to RTL. */
export async function setLanguage(code: string): Promise<void> {
  await i18n.changeLanguage(code);
  applyDirection(code);
  try { await AsyncStorage.setItem(STORAGE_KEY, code); } catch {}
}

export function currentLanguage(): string { return i18n.language || 'en'; }
export function isRTL(): boolean { return RTL_LANGS.has(currentLanguage()); }

export default i18n;
