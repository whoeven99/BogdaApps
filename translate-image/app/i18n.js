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
