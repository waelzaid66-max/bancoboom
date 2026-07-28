import React from "react";
import { Text as RNText, StyleSheet, type TextProps } from "react-native";

import { useI18n } from "@/context/LanguageContext";

const INTER_TO_CAIRO: Record<string, string> = {
  Inter_400Regular: "Cairo_400Regular",
  Inter_500Medium: "Cairo_500Medium",
  Inter_600SemiBold: "Cairo_600SemiBold",
  Inter_700Bold: "Cairo_700Bold",
};

/**
 * Drop-in replacement for react-native's <Text>. In Arabic it swaps the
 * Inter font family for the matching Cairo weight (Inter has no Arabic
 * glyphs) and sets RTL writing direction. In English it renders untouched.
 */
export function AppText({ style, ...props }: TextProps) {
  const { isRTL } = useI18n();
  if (!isRTL) {
    return <RNText style={style} {...props} />;
  }
  const flat = (StyleSheet.flatten(style) || {}) as { fontFamily?: string };
  const family = flat.fontFamily;
  const mapped = family ? INTER_TO_CAIRO[family] ?? family : "Cairo_400Regular";
  return (
    <RNText
      style={[style, { fontFamily: mapped, writingDirection: "rtl" }]}
      {...props}
    />
  );
}
