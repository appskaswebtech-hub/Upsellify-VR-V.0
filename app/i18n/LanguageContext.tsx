import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useFetcher } from "@remix-run/react";
import { DEFAULT_LOCALE, type Dictionary, type Locale } from "./types";
import { getDictionary } from "./index";

interface LanguageContextValue {
  locale: Locale;
  isAuto: boolean;
  t: Dictionary;
  isChangingLocale: boolean;
  setLocale: (locale: Locale) => void;
  resetToAuto: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  /** Locale resolved on the server: either auto-detected from Accept-Language, or the shop's saved override. */
  detectedLocale: Locale;
  isAuto: boolean;
  children: ReactNode;
}

export function LanguageProvider({ detectedLocale, isAuto, children }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(detectedLocale);
  const [auto, setAuto] = useState<boolean>(isAuto);
  const fetcher = useFetcher();

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    setAuto(false);
    fetcher.submit({ locale: next }, { method: "post", action: "/api/locale" });
  };

  const resetToAuto = () => {
    setAuto(true);
    fetcher.submit({ locale: "auto" }, { method: "post", action: "/api/locale" });
  };

  const isChangingLocale = fetcher.state !== "idle";

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, isAuto: auto, t: getDictionary(locale), isChangingLocale, setLocale, resetToAuto }),
    [locale, auto, isChangingLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      isAuto: true,
      t: getDictionary(DEFAULT_LOCALE),
      isChangingLocale: false,
      setLocale: () => {},
      resetToAuto: () => {},
    };
  }
  return ctx;
}
