// BANCO palettes. Dark is the primary/default brand look; light/day is additive
// and shares the same red brand accent. Both palettes expose the SAME token keys
// so any screen using the design tokens adapts automatically when the user flips
// the Day/Night switch in Settings (see context/ThemeContext + hooks/useColors).
const BANCO_DARK = {
  text: "#FFFFFF",
  tint: "#E8002D",
  background: "#000000",
  foreground: "#FFFFFF",
  card: "#111111",
  cardForeground: "#FFFFFF",
  primary: "#E8002D",
  primaryForeground: "#FFFFFF",
  secondary: "#1A1A1A",
  secondaryForeground: "#CCCCCC",
  muted: "#1A1A1A",
  mutedForeground: "#888888",
  accent: "#FF1744",
  accentForeground: "#FFFFFF",
  destructive: "#FF3B30",
  destructiveForeground: "#FFFFFF",
  border: "#222222",
  input: "#1A1A1A",
};

const BANCO_LIGHT = {
  text: "#0A0A0A",
  tint: "#E8002D",
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  card: "#FFFFFF",
  cardForeground: "#0A0A0A",
  primary: "#E8002D",
  primaryForeground: "#FFFFFF",
  secondary: "#F4F4F5",
  secondaryForeground: "#3F3F46",
  muted: "#F4F4F5",
  mutedForeground: "#6B7280",
  accent: "#FF1744",
  accentForeground: "#FFFFFF",
  destructive: "#DC2626",
  destructiveForeground: "#FFFFFF",
  border: "#E4E4E7",
  input: "#F4F4F5",
};

const colors = {
  light: BANCO_LIGHT,
  dark: BANCO_DARK,
  radius: 12,
};

export type ColorScheme = "light" | "dark";

export default colors;
