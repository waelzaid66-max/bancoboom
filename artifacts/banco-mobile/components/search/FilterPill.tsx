/**
 * FilterPill — the one filter control shape in the app.
 *
 * This is an EXTRACTION, not a new design. Two pills were already built,
 * shipped and approved: Stay's rental-term button and the market-country
 * button. Both are the same idea — a compact control that shows its CURRENT
 * VALUE and opens a picker — so the idea is proven; it was just written twice
 * and available in only two places.
 *
 * The metrics below are Stay's rental-term button to the pixel (measured in the
 * running app before extraction: 108×25, padding 4/10, gap 5, radius 20,
 * 1px border). Stay's is the newer of the two and the only one with an ACTIVE
 * state, which is the part that matters most: a filter the user cannot see is
 * applied is a filter they stop trusting.
 *
 * Why value-on-the-pill rather than a filter sheet:
 * measured in the same app, the market row ran 1485px of chips inside a 343px
 * window — four screens of sideways scrolling — and everything else lived
 * behind a sheet, so a browsing user could not tell what was applied without
 * opening a door. A pill that reads "EGP 2M–5M" answers that without any door.
 *
 * Deliberately NOT included: the picker. Each pill owns its own picker, because
 * a market list, a price range and a year range have nothing in common past the
 * trigger. This component is the trigger only.
 */
import React from "react";
import { Pressable, StyleSheet } from "react-native";

import { AppText } from "@/components/AppText";
import { Feather } from "@/components/icons";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/LanguageContext";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

export function FilterPill({
  icon,
  label,
  accent,
  active = false,
  accentColor,
  onPress,
  testID,
  accessibilityLabel,
  maxLabelWidth = 120,
}: {
  /** Leading glyph. Must exist in the SVG icon registry (see components/icons). */
  icon?: FeatherName;
  /** The pill's CURRENT VALUE — never a static field name like "Price". */
  label: string;
  /** Optional trailing accent, e.g. the market's currency next to its country. */
  accent?: string;
  /** Filled state: this filter is applied. Drives the whole colour flip. */
  active?: boolean;
  /** Brand accent for the filled state; falls back to the theme primary. */
  accentColor?: string;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
  maxLabelWidth?: number;
}) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const fill = accentColor ?? colors.primary;
  // One flip drives every child, so an applied filter can never read as unapplied.
  const on = active;
  const contentColor = on ? "#FFFFFF" : colors.foreground;
  const mutedColor = on ? "#FFFFFF" : colors.mutedForeground;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          flexDirection: isRTL ? "row-reverse" : "row",
          backgroundColor: on ? fill : colors.secondary,
          borderColor: on ? fill : colors.border,
        },
      ]}
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
    >
      {icon ? <Feather name={icon} size={13} color={mutedColor} /> : null}
      <AppText
        style={[styles.label, { color: contentColor, maxWidth: maxLabelWidth }]}
        numberOfLines={1}
      >
        {label}
      </AppText>
      {accent ? (
        <AppText style={[styles.accent, { color: on ? "#FFFFFF" : fill }]}>
          {accent}
        </AppText>
      ) : null}
      <Feather name="chevron-down" size={13} color={mutedColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Stay's rental-term button, to the pixel — see the header note.
  pill: {
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flexShrink: 1,
  },
  accent: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
});
