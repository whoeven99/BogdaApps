// export default {
//   // This is the list of languages your application supports
//   supportedLngs: ["en", "fr", "de", "es", "it", "nl", "pt", "sv", "ja", "ko", "ru" , "tr" , "uk" , "zh-CN", "zh-TW"],
//   // This is the language you want to use in case
//   // if the user language is not in the supportedLngs
//   interpolation: {
//     escapeValue: false,
//   },

//   fallbackLng: "en",
//   // The default namespace of i18next is "translation", but you can customize it here
//   // defaultNS: "common",
// };

// import i18n from 'i18next';
// import { initReactI18next } from 'react-i18next';
// import Backend from 'i18next-http-backend';
// import LanguageDetector from 'i18next-browser-languagedetector';
// import { RemixI18Next } from 'remix-i18next';

// const i18next = new RemixI18Next({
//   i18next: {
//     supportedLngs: ["en", "fr", "de", "es", "it", "nl", "pt", "sv", "ja", "ko", "ru", "tr", "uk", "zh-CN", "zh-TW"],
//     fallbackLng: "en",
//     backend: {
//       loadPath: '/locales/{{lng}}/translation.json',
//     },
//     interpolation: {
//       escapeValue: false,
//     },
//   },
//   plugins: [Backend, LanguageDetector, initReacI18nextt],
// });

// // 初始化 i18n 实例，确保 SSR 和 CSR 都能使用
// i18n.use(Backend).use(LanguageDetector).use(initReactI18next).init({
//   supportedLngs: ["en", "fr", "de", "es", "it", "nl", "pt", "sv", "ja", "ko", "ru", "tr", "uk", "zh-CN", "zh-TW"],
//   fallbackLng: "en",
//   backend: {
//     loadPath: '/locales/{{lng}}/translation.json',
//   },
//   interpolation: {
//     escapeValue: false,
//   },
// });

// export { i18next, i18n };

// import i18next from "i18next";
// import { initReactI18next } from "react-i18next";
// import enTranslations from "./locales/en.json";
// import zhTranslations from "./locales/zh.json";

// i18next.use(initReactI18next).init({
//   resources: {
//     en: { translation: enTranslations },
//     zh: { translation: zhTranslations },
//   },
//   lng: "en",
//   fallbackLng: "en",
//   interpolation: {
//     escapeValue: false,
//   },
// });

// export default i18next;

export default {
  // This is the list of languages your application supports
  supportedLngs: ["en", "fr", "de", "es", "it", "nl", "pt", "sv", "ja", "ko", "ru" , "tr" , "uk" , "zh-CN", "zh-TW"],
  // This is the language you want to use in case
  // if the user language is not in the supportedLngs
  interpolation: {
    escapeValue: false,
  },

  fallbackLng: "en",
  // The default namespace of i18next is "translation", but you can customize it here
  // defaultNS: "common",
};