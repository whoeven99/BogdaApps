// src/i18n/client-i18n.ts   ← 只在客户端组件导入！
"use client";  // 加这行更保险（可选）

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'zh',
    backend: {
      loadPath: '/locales/{{lng}}/translation.json'
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag', 'cookie'],
      caches: ['localStorage', 'cookie']
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;