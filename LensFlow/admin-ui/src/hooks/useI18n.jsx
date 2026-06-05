import React, { createContext, useContext, useState, useCallback } from "react";
import en from "../locales/en.json";
import zh from "../locales/zh-CN.json";

const I18nContext = createContext(null);

const locales = { en, "zh-CN": zh };

function detectLang() {
  try {
    const nav = (typeof navigator !== "undefined" && navigator.language) || "";
    if (nav.startsWith("zh")) return "zh-CN";
    if (nav.startsWith("ja") || nav.startsWith("ko") || nav.startsWith("vi")) return "zh-CN";
  } catch {}
  return "en";
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(detectLang);

  const t = useCallback((path) => {
    const keys = path.split(".");
    let val = locales[lang] || locales.en;
    for (const k of keys) {
      val = val?.[k];
      if (val === undefined) break;
    }
    if (val === undefined) {
      const fallback = locales.en;
      let fb = fallback;
      for (const k of keys) fb = fb?.[k];
      return fb !== undefined ? fb : path;
    }
    return val;
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang(prev => prev === "en" ? "zh-CN" : "en");
  }, []);

  return (
    <I18nContext.Provider value={{ t, lang, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) return { t: (path) => path, lang: "en", toggleLang: () => {} };
  return ctx;
}
