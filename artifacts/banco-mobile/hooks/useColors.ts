import colors from "@/constants/colors";
import { useThemeMode } from "@/context/ThemeContext";

/**
 * Returns the design tokens for the user's chosen color scheme.
 *
 * The active palette is driven by the in-app Day/Night theme choice
 * (see context/ThemeContext) rather than the device's system appearance —
 * BANCO defaults to dark and only switches to light when the user opts in
 * from Settings. The returned object contains all color tokens for the
 * active palette plus scheme-independent values like `radius`.
 */
export function useColors() {
  const { mode } = useThemeMode();
  const palette = mode === "light" ? colors.light : colors.dark;
  return { ...palette, radius: colors.radius };
}
