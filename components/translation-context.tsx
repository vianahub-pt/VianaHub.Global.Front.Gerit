"use client";

import { createContext, useContext, useMemo, useReducer, useCallback } from "react";

interface TranslationState {
  locale: string;
}

type TranslationAction = { type: "SET_LOCALE"; payload: string };

const TranslationContext = createContext<{
  state: TranslationState;
  setLocale: (locale: string) => void;
} | null>(null);

function translationReducer(state: TranslationState, action: TranslationAction): TranslationState {
  switch (action.type) {
    case "SET_LOCALE":
      return { ...state, locale: action.payload };
    default:
      return state;
  }
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(translationReducer, { locale: "pt-PT" });

  const setLocale = useCallback((locale: string) => {
    dispatch({ type: "SET_LOCALE", payload: locale });
  }, []);

  const value = useMemo(() => ({ state, setLocale }), [state, setLocale]);

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) throw new Error("useTranslation must be used within TranslationProvider");
  return context;
}
