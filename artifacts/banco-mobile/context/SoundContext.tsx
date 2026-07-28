import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const SOUND_KEY = "banco.sound_enabled";
const NOTIF_KEY = "banco.notifications_enabled";

// Per-service UI cues. Kept short (<1s) and mapped to a moment: a light tap for
// generic interactions, an engine rev for vehicles, a key/latch for property.
export type SoundName = "engine" | "key" | "tap";

const SOURCES: Record<SoundName, number> = {
  engine: require("@/assets/sounds/engine.wav"),
  key: require("@/assets/sounds/key.wav"),
  tap: require("@/assets/sounds/tap.wav"),
};

type SoundContextValue = {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  ready: boolean;
  setSoundEnabled: (b: boolean) => void;
  setNotificationsEnabled: (b: boolean) => void;
  playSound: (name: SoundName) => void;
};

const SoundContext = createContext<SoundContextValue | undefined>(undefined);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [ready, setReady] = useState(false);

  // Players are created lazily on first use and reused (replayed via seekTo) so
  // we never reload the asset on every cue. soundEnabledRef lets the imperative
  // playSound read the latest toggle without being recreated each render.
  const playersRef = useRef<Partial<Record<SoundName, AudioPlayer>>>({});
  const soundEnabledRef = useRef(true);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    // Play SFX through the normal media channel; don't hijack the silent switch.
    setAudioModeAsync({ playsInSilentMode: false }).catch(() => {});
    (async () => {
      try {
        const [s, n] = await AsyncStorage.multiGet([SOUND_KEY, NOTIF_KEY]);
        if (s[1] != null) setSoundEnabledState(s[1] === "1");
        if (n[1] != null) setNotificationsEnabledState(n[1] === "1");
      } catch {
        // ignore — fall back to enabled defaults
      }
      setReady(true);
    })();

    const players = playersRef.current;
    return () => {
      Object.values(players).forEach((p) => {
        try {
          p?.remove();
        } catch {
          // ignore teardown errors
        }
      });
    };
  }, []);

  const value = useMemo<SoundContextValue>(() => {
    const setSoundEnabled = (b: boolean) => {
      setSoundEnabledState(b);
      AsyncStorage.setItem(SOUND_KEY, b ? "1" : "0").catch(() => {});
    };
    const setNotificationsEnabled = (b: boolean) => {
      setNotificationsEnabledState(b);
      AsyncStorage.setItem(NOTIF_KEY, b ? "1" : "0").catch(() => {});
    };
    const playSound = (name: SoundName) => {
      if (!soundEnabledRef.current) return;
      try {
        let player = playersRef.current[name];
        if (!player) {
          player = createAudioPlayer(SOURCES[name]);
          playersRef.current[name] = player;
        }
        player.seekTo(0);
        player.play();
      } catch {
        // Best-effort: audio is non-critical feedback.
      }
    };
    return {
      soundEnabled,
      notificationsEnabled,
      ready,
      setSoundEnabled,
      setNotificationsEnabled,
      playSound,
    };
  }, [soundEnabled, notificationsEnabled, ready]);

  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
}

// Safe outside a provider — returns no-op players so a stray consumer can't crash.
export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    return {
      soundEnabled: true,
      notificationsEnabled: true,
      ready: true,
      setSoundEnabled: () => {},
      setNotificationsEnabled: () => {},
      playSound: () => {},
    };
  }
  return ctx;
}
