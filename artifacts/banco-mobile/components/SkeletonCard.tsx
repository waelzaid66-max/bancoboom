import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SkeletonBlockProps {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}

export function SkeletonBlock({ width, height, borderRadius, style }: SkeletonBlockProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width ?? "100%",
          height,
          backgroundColor: colors.muted,
          borderRadius: borderRadius ?? 6,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  const colors = useColors();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <SkeletonBlock height={200} borderRadius={0} />
      <View style={styles.content}>
        <View style={styles.priceRow}>
          <SkeletonBlock width="50%" height={20} />
          <SkeletonBlock width="30%" height={18} />
        </View>
        <SkeletonBlock width="90%" height={14} style={{ marginTop: 6 }} />
        <SkeletonBlock width="70%" height={14} style={{ marginTop: 4 }} />
        <View style={styles.metaRow}>
          <SkeletonBlock width="40%" height={12} />
          <SkeletonBlock width="30%" height={12} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  content: {
    padding: 12,
    gap: 6,
  },
  priceRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
});
