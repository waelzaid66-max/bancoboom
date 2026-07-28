import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { Ionicons } from "@/components/icons";
import { sectionGradient, sectionMotif } from "@/lib/sectionTheme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * The section-identity backdrop every card falls back to when a listing has no
 * photo. A card is NEVER a blank grey box: it always carries its world's colour
 * gradient + a large, faint motif icon, exactly the language the four main
 * Discover section cards speak. Fills its parent absolutely by default.
 */
export function SectionBackdrop({
  section,
  motifSize = 64,
  style,
  rounded,
}: {
  section: string | null | undefined;
  motifSize?: number;
  style?: ViewStyle;
  /** Corner radius when used as a standalone (non-absolute) block. */
  rounded?: number;
}) {
  const [from, to] = sectionGradient(section);
  const motif = sectionMotif(section) as IoniconName;

  return (
    <View
      style={[
        styles.fill,
        rounded != null ? { borderRadius: rounded, overflow: "hidden" } : null,
        style,
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[from, to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.center}>
        <Ionicons name={motif} size={motifSize} color="rgba(255,255,255,0.22)" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
