import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ja from './ja';
import en from './en';
import zh from './zh';

i18n.use(initReactI18next).init({
  resources: {
    ja: { translation: ja },
    en: { translation: en },
    zh: { translation: zh }
  },
  lng: 'ja',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});

export default i18n;
