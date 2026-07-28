import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { translations, type Lang } from "@/lib/i18n";

/**
 * Language state for the Admin Control Center. Persisted per browser
 * (localStorage) and applied to <html dir/lang> so the whole document flips to
 * RTL for Arabic — flex/grid/margins mirror automatically via logical CSS.
 */

const STORAGE_KEY = "banco_admin_lang";

interface LanguageValue {
  lang: Lang;
  isRTL: boolean;
  setLang: (l: Lang) => void;
  toggle: () => void;
  /** Dotted-path lookup, e.g. t("nav.overview"). Falls back to the key itself. */
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

function readStored(): Lang {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStored);
  const isRTL = lang === "ar";

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Private mode etc. — the in-memory state still works for the session.
    }
  }, [lang, isRTL]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggle = useCallback(
    () => setLangState((prev) => (prev === "en" ? "ar" : "en")),
    [],
  );

  const t = useCallback(
    (key: string): string => {
      let node: unknown = translations[lang];
      for (const part of key.split(".")) {
        if (node && typeof node === "object" && part in (node as object)) {
          node = (node as Record<string, unknown>)[part];
        } else {
          return key;
        }
      }
      return typeof node === "string" ? node : key;
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, isRTL, setLang, toggle, t }),
    [lang, isRTL, setLang, toggle, t],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLang(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
