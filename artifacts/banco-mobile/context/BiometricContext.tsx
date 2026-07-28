import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform, Pressable, StyleSheet, View } from "react-native";

import { Feather } from "@/components/icons";
import { AppText } from "@/components/AppText";
import { BancoLogo } from "@/components/BancoLogo";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

const STORAGE_KEY = "banco.biometric.enabled";

type BiometricContextValue = {
  /** Whether the device has biometric hardware that is enrolled. */
  supported: boolean;
  /** Whether the user has turned biometric unlock on. */
  enabled: boolean;
  /** Whether the app is currently locked behind a biometric prompt. */
  locked: boolean;
  /** Turn biometric unlock on/off. Enabling first verifies with a live prompt. */
  setEnabled: (next: boolean) => Promise<boolean>;
  /** Run the biometric prompt to clear an active lock. */
  unlock: () => Promise<void>;
};

const BiometricContext = createContext<BiometricContextValue | undefined>(
  undefined,
);

export function BiometricProvider({ children }: { children: React.ReactNode }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  // Until the saved preference + hardware are resolved we cannot know whether
  // the app should be locked, so we cover the UI to avoid flashing content to a
  // user who has biometric unlock turned on.
  const [hydrated, setHydrated] = useState(false);
  // Mirror of `enabled` for use inside listeners without stale closures.
  const enabledRef = useRef(false);
  const unlockingRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // On boot: detect hardware and restore the saved preference. If biometric
  // unlock is on, start locked so app entry is gated immediately.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let hw = false;
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        hw = hasHardware && enrolled;
      } catch {
        hw = false;
      }
      let on = false;
      try {
        on = (await AsyncStorage.getItem(STORAGE_KEY)) === "1";
      } catch {
        on = false;
      }
      if (cancelled) return;
      setSupported(hw);
      const active = hw && on;
      setEnabledState(active);
      enabledRef.current = active;
      if (active) setLocked(true);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runPrompt = useCallback(async (): Promise<boolean> => {
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "BANCO",
        disableDeviceFallback: false,
        cancelLabel: undefined,
      });
      return res.success;
    } catch {
      return false;
    }
  }, []);

  const unlock = useCallback(async () => {
    if (unlockingRef.current) return;
    unlockingRef.current = true;
    try {
      const ok = await runPrompt();
      if (ok) setLocked(false);
    } finally {
      unlockingRef.current = false;
    }
  }, [runPrompt]);

  // Auto-prompt as soon as a lock becomes active (boot or returning to
  // foreground) so the user doesn't have to tap an extra button first.
  useEffect(() => {
    if (locked) void unlock();
  }, [locked, unlock]);

  // Re-lock whenever the app leaves the foreground so it's protected on return.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if ((state === "background" || state === "inactive") && enabledRef.current) {
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  const setEnabled = useCallback(
    async (next: boolean): Promise<boolean> => {
      if (next) {
        // Verify the user can actually pass the biometric check before turning
        // it on, so they can never lock themselves out by mistake.
        const ok = await runPrompt();
        if (!ok) return false;
        setEnabledState(true);
        enabledRef.current = true;
        AsyncStorage.setItem(STORAGE_KEY, "1").catch(() => {});
        return true;
      }
      setEnabledState(false);
      enabledRef.current = false;
      setLocked(false);
      AsyncStorage.setItem(STORAGE_KEY, "0").catch(() => {});
      return true;
    },
    [runPrompt],
  );

  return (
    <BiometricContext.Provider
      value={{ supported, enabled, locked, setEnabled, unlock }}
    >
      {children}
      {!hydrated ? <HydrationGate /> : locked ? <LockOverlay onUnlock={unlock} /> : null}
    </BiometricContext.Provider>
  );
}

// Neutral, opaque cover shown only during the brief boot window while we resolve
// the saved biometric preference. It blocks interaction on native so no app
// content is shown or touchable before a potential lock is applied.
function HydrationGate() {
  const colors = useColors();
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { backgroundColor: colors.background },
      ]}
      pointerEvents={Platform.OS === "web" ? "none" : "auto"}
    >
      <BancoLogo height={44} />
    </View>
  );
}

function LockOverlay({ onUnlock }: { onUnlock: () => void }) {
  const colors = useColors();
  const { t } = useI18n();
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { backgroundColor: colors.background },
      ]}
      // Web can't run native biometrics; the overlay is mobile-only in practice
      // but rendering it harmlessly keeps behavior consistent.
      pointerEvents={Platform.OS === "web" ? "none" : "auto"}
    >
      <BancoLogo height={44} />
      <Feather
        name="lock"
        size={40}
        color={colors.primary}
        style={styles.lockIcon}
      />
      <AppText style={[styles.lockTitle, { color: colors.foreground }]}>
        {t("settings.lockTitle")}
      </AppText>
      <AppText style={[styles.lockHint, { color: colors.mutedForeground }]}>
        {t("settings.lockHint")}
      </AppText>
      <Pressable
        onPress={onUnlock}
        style={[
          styles.unlockBtn,
          { backgroundColor: colors.primary, borderRadius: colors.radius },
        ]}
        testID="biometric-unlock"
      >
        <Feather name="unlock" size={18} color={colors.primaryForeground} />
        <AppText style={[styles.unlockText, { color: colors.primaryForeground }]}>
          {t("settings.unlock")}
        </AppText>
      </Pressable>
    </View>
  );
}

export function useBiometric(): BiometricContextValue {
  const ctx = useContext(BiometricContext);
  if (!ctx) {
    throw new Error("useBiometric must be used within BiometricProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
    zIndex: 9999,
  },
  lockIcon: { marginTop: 24, marginBottom: 4 },
  lockTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginTop: 8,
  },
  lockHint: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 300,
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  unlockText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
