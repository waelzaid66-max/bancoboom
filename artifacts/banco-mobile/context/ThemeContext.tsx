import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ColorScheme } from "@/constants/colors";

const STORAGE_KEY = "banco.theme";

// Dark is BANCO's primary/default look. Light/day is additive and opt-in via the
// Day/Night switch in Settings. The chosen mode persists across launches and
// overrides the device's system appearance (we never follow the OS scheme).
const DEFAULT_MODE: ColorScheme = "dark";

type ThemeContextValue = {
  mode: ColorScheme;
  ready: boolean;
  setMode: (m: ColorScheme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ColorScheme>(DEFAULT_MODE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark") setModeState(stored);
      } catch {
        // ignore — fall back to the default (dark) theme
      }
      setReady(true);
    })();
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const setMode = (m: ColorScheme) => {
      setModeState(m);
      AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
    };
    return {
      mode,
      ready,
      setMode,
      toggle: () => setMode(mode === "dark" ? "light" : "dark"),
    };
  }, [mode, ready]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// Safe to call outside a provider — falls back to the default dark mode so a
// stray consumer never crashes (useColors relies on this).
export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      mode: DEFAULT_MODE,
      ready: true,
      setMode: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}
