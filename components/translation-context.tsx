"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import ptPTTranslations from "@/locales/pt-PT/common.json";
import enUSTranslations from "@/locales/en-US/common.json";
import esESTranslations from "@/locales/es-ES/common.json";
import {
  DEFAULT_LANGUAGE,
  type Language,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  normalizeLanguageTag,
} from "@/lib/language";

const LANGUAGE_STORAGE_KEY = "language";

export { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/lib/language";
export type { Language } from "@/lib/language";

interface TranslationState {
  locale: Language;
}

type TranslationDictionary = Record<string, string>;

const translations: Record<Language, TranslationDictionary> = {
  "pt-PT": ptPTTranslations,
  "en-US": enUSTranslations,
  "es-ES": esESTranslations,
};

function resolveBrowserLanguage(): Language {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  return normalizeLanguageTag(
    window.navigator.languages?.[0] ?? window.navigator.language,
  );
}

function resolveInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (isSupportedLanguage(storedLanguage)) {
    return storedLanguage;
  }

  return resolveBrowserLanguage();
}

function interpolateMessage(
  template: string,
  values?: Record<string, string | number>,
) {
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce((message, [key, value]) => {
    return message.replaceAll(`{{${key}}}`, String(value));
  }, template);
}

const TranslationContext = createContext<{
  state: TranslationState;
  language: Language;
  setLocale: (locale: Language) => void;
  setLanguage: (language: Language) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
} | null>(null);

export function TranslationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    setLanguageState(resolveInitialLanguage());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
  }, []);

  const t = useCallback(
    (key: string, values?: Record<string, string | number>) => {
      const template = translations[language][key] ?? key;
      return interpolateMessage(template, values);
    },
    [language],
  );

  const value = useMemo(
    () => ({
      state: { locale: language },
      language,
      setLocale: setLanguage,
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);

  if (!context) {
    throw new Error(
      "useTranslation must be used within TranslationProvider",
    );
  }

  return context;
}
