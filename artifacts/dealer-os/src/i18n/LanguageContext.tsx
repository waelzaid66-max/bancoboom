import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { STRINGS, type Lang } from "./strings";

/**
 * Web i18n for Banco Market — mirrors the mobile app's LanguageContext
 * (t / lang / isRTL / toggle) but uses localStorage for persistence and the
 * document `dir`/`lang` attributes for RTL (instead of RN AsyncStorage /
 * I18nManager). Wrap the whole app once (see main.tsx); call useI18n() anywhere.
 */
const STORAGE_KEY = "banco-market-lang";

type Params = Record<string, string | number>;

interface I18nValue {
  lang: Lang;
  isRTL: boolean;
  t: (key: string, params?: Params) => string;
  toggle: () => void;
  setLang: (l: Lang) => void;
}

const LanguageContext = createContext<I18nValue | null>(null);

function resolve(dict: Record<string, unknown>, path: string): string {
  const val = path
    .split(".")
    .reduce<unknown>((o, k) => (o != null && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), dict);
  return typeof val === "string" ? val : path; // missing key → show key (no crash)
}

function readInitialLang(): Lang {
  if (typeof localStorage === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "ar" || stored === "en" ? stored : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);
  const isRTL = lang === "ar";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [lang, isRTL]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage unavailable (private mode) — language still works for the session */
    }
  };

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      isRTL,
      t: (key, params) => {
        let s = resolve(STRINGS[lang], key);
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
          }
        }
        return s;
      },
      toggle: () => setLang(isRTL ? "en" : "ar"),
      setLang,
    }),
    [lang, isRTL],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within a LanguageProvider");
  return ctx;
}
