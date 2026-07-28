import { Feather } from "@/components/icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

/**
 * Floating "Post Asset" action docked to the bottom-left corner just above the
 * tab bar — a fixed piece of chrome, not mirrored by language. A compact
 * red circular button with a small caption underneath, à la modern marketplace
 * apps. It breathes with a subtle looping pulse to draw the eye and springs in
 * on press. Rendered once in the tab layout so it appears on every tab.
 */
export function PostAssetFab() {
  const colors = useColors();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  // Clearance for the floating capsule tab bar (bottom margin + capsule height),
  // so the circular action sits just above the capsule's bottom corner.
  const tabBarHeight = Platform.OS === "web" ? 92 : 78 + insets.bottom;
  // Fixed to the left — the FAB is chrome and stays put across languages.
  const sideKey = "left";

  const pulse = useRef(new Animated.Value(1)).current;
  const press = useRef(new Animated.Value(1)).current;
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.08,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(halo, {
            toValue: 1,
            duration: 1100,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(halo, {
            toValue: 0,
            duration: 1100,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, halo]);

  const onPressIn = () =>
    Animated.spring(press, {
      toValue: 0.86,
      useNativeDriver: true,
    }).start();
  const onPressOut = () =>
    Animated.spring(press, {
      toValue: 1,
      friction: 4,
      tension: 90,
      useNativeDriver: true,
    }).start();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: tabBarHeight + 16, [sideKey]: 16 }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            backgroundColor: colors.primary,
            opacity: halo.interpolate({
              inputRange: [0, 1],
              outputRange: [0.35, 0],
            }),
            transform: [
              {
                scale: halo.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1.7],
                }),
              },
            ],
          },
        ]}
      />
      <Pressable
        onPress={() => router.push("/listings/create")}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        testID="post-asset-fab"
        accessibilityRole="button"
        accessibilityLabel={t("home.postAsset")}
      >
        <Animated.View
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              transform: [{ scale: Animated.multiply(pulse, press) }],
            },
          ]}
        >
          <Feather name="plus" size={26} color={colors.primaryForeground} />
        </Animated.View>
      </Pressable>
      <AppText style={styles.label} numberOfLines={1}>
        {t("home.postAsset")}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignItems: "center",
  },
  halo: {
    position: "absolute",
    top: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E8002D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  label: {
    marginTop: 5,
    fontSize: 10.5,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
});
