import { useAuth, useUser } from "@clerk/expo";
import {
  useListConversations,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { Feather } from "@/components/icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { BGlyph } from "@/components/BReactionButton";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { PostAssetFab } from "@/components/PostAssetFab";

type FeatherName = React.ComponentProps<typeof Feather>["name"];
type TabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];

const isAndroid = Platform.OS === "android";
const isIOS = Platform.OS === "ios";
const isWeb = Platform.OS === "web";

const TAB_CONFIG: Record<string, { icon: FeatherName; labelKey: string }> = {
  index: { icon: "home", labelKey: "tabs.feed" },
  search: { icon: "search", labelKey: "tabs.search" },
  messages: { icon: "message-circle", labelKey: "tabs.messages" },
  saved: { icon: "heart", labelKey: "tabs.saved" },
  profile: { icon: "user", labelKey: "tabs.profile" },
};

/**
 * Animated tab icon with a focused tinted "pill" highlight.
 *
 * Rendered as a real component (not an inline factory) so React / the React
 * Compiler keep a stable identity — re-creating the icon every render can make
 * the glyph flash or drop out. Icons come from the app-owned registry
 * (@/components/icons), which renders SVGs (lucide-react-native) instead of
 * icon fonts — the radical fix for the Android app-wide ".notdef"/tofu bug.
 */
function TabBarIcon({
  name,
  color,
  focused,
}: {
  name: FeatherName;
  color: string;
  focused: boolean;
}) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, {
      duration: reduceMotion ? 0 : 220,
    });
  }, [focused, progress, reduceMotion]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.16,
    transform: [{ scale: 0.7 + progress.value * 0.3 }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -progress.value * 2 },
      { scale: 1 + progress.value * 0.06 },
    ],
  }));

  return (
    <View style={styles.iconWrap}>
      <Animated.View
        pointerEvents="none"
        style={[styles.pill, { backgroundColor: colors.primary }, pillStyle]}
      />
      <Animated.View style={iconStyle}>
        <Feather name={name} size={22} color={color} />
      </Animated.View>
    </View>
  );
}

function useUnreadMessages(): number {
  const { isSignedIn } = useAuth();
  const { data } = useListConversations({
    query: {
      queryKey: getListConversationsQueryKey(),
      enabled: !!isSignedIn,
      refetchInterval: 15000,
      refetchOnWindowFocus: true,
    },
  });
  return (data?.data ?? []).reduce((sum, c) => sum + (c.unread ?? 0), 0);
}

/**
 * Floating iOS-style capsule tab bar.
 *
 * A rounded, near-opaque "card" that floats above the screen with a soft drop
 * shadow. Because the surface is ROUNDED, the Android `elevation` shadow is a
 * desirable soft floating shadow (the old full-width-bar "opaque box" problem
 * only affects rectangular bars, so a BlurView is unnecessary here and avoided —
 * never render BlurView on Android + New Arch, it swallows touches).
 *
 * Each tab keeps its written label (per product spec). The Profile tab shows the
 * signed-in user's avatar when available, falling back to the person glyph. The
 * separate circular "Post asset" action is rendered alongside (PostAssetFab).
 */
function CapsuleTabBar({ state, navigation }: TabBarProps) {
  const colors = useColors();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const unread = useUnreadMessages();
  const { user } = useUser();

  const useBlur = isIOS;
  return (
    <View
      pointerEvents="box-none"
      style={[styles.barWrap, { bottom: insets.bottom + (isWeb ? 10 : 8) }]}
    >
      <View
        style={[
          styles.shadowHost,
          isAndroid && {
            backgroundColor: isDark ? "#16161A" : "#FFFFFF",
            elevation: 14,
          },
        ]}
      >
        <View
          style={[
            styles.capsule,
            {
              borderColor: isDark ? "rgba(255,255,255,0.12)" : colors.border,
              // Tab order is fixed furniture — never mirrored by language.
              flexDirection: "row",
            },
          ]}
        >
          {/* Frosted-glass layer — sits behind the buttons and never grabs
              touches. iOS uses a real BlurView (genuine Apple frosted glass);
              Android uses an opaque-ish gradient (Dimezis blur eats touches on
              New Arch — see memory) but still reads as tinted glass. */}
          {useBlur ? (
            <BlurView
              pointerEvents="none"
              intensity={isDark ? 42 : 64}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <LinearGradient
              pointerEvents="none"
              colors={
                isDark
                  ? ["rgba(40,40,46,0.94)", "rgba(20,20,24,0.96)"]
                  : ["rgba(255,255,255,0.96)", "rgba(244,244,247,0.94)"]
              }
              style={StyleSheet.absoluteFill}
            />
          )}
          {/* Translucent body tint over the iOS blur for colour + legibility. */}
          {useBlur ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isDark
                    ? "rgba(22,22,26,0.40)"
                    : "rgba(255,255,255,0.32)",
                },
              ]}
            />
          ) : null}
          {/* Top rim highlight — light catching the glass edge (the 3D feel). */}
          <View
            pointerEvents="none"
            style={[
              styles.rim,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.16)"
                  : "rgba(255,255,255,0.85)",
              },
            ]}
          />
          {state.routes.map((route, index) => {
          const cfg = TAB_CONFIG[route.name];
          if (!cfg) return null;
          const focused = state.index === index;
          const tint = focused ? colors.primary : colors.mutedForeground;
          const isProfile = route.name === "profile";
          const showBadge = route.name === "messages" && unread > 0;

          const onPress = () => {
            if (!isWeb) Haptics.selectionAsync();
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t(cfg.labelKey)}
              testID={`tab-${route.name}`}
            >
              <View style={styles.iconSlot}>
                {isProfile && user?.hasImage ? (
                  <Image
                    source={{ uri: user.imageUrl }}
                    style={[
                      styles.avatar,
                      { borderColor: focused ? colors.primary : "transparent" },
                    ]}
                    contentFit="cover"
                    transition={120}
                  />
                ) : route.name === "saved" ? (
                  // The identity "B" replaces the heart — the exact logo glyph,
                  // static and crisp (never animated in the tab bar). Focus is
                  // communicated by opacity so the metallic texture stays intact.
                  <View style={{ opacity: focused ? 1 : 0.45 }}>
                    {/* height 30 (not 22): the B letter fills only part of the
                        cropped wordmark, so a larger box makes the VISIBLE B
                        match the 22px sibling tab icons. Logo pixels untouched. */}
                    <BGlyph height={30} />
                  </View>
                ) : (
                  <TabBarIcon name={cfg.icon} color={tint} focused={focused} />
                )}
                {showBadge ? (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: colors.primary,
                        borderColor: isDark ? "#1A1A1E" : "#FFFFFF",
                      },
                    ]}
                  >
                    <AppText
                      style={[
                        styles.badgeText,
                        { color: colors.primaryForeground },
                      ]}
                    >
                      {unread > 99 ? "99+" : String(unread)}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText numberOfLines={1} style={[styles.tabLabel, { color: tint }]}>
                {t(cfg.labelKey)}
              </AppText>
            </Pressable>
          );
        })}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CapsuleTabBar {...props} />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="search" />
        <Tabs.Screen name="messages" />
        <Tabs.Screen name="saved" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <PostAssetFab />
    </View>
  );
}

const styles = StyleSheet.create({
  barWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 14,
  },
  shadowHost: {
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  capsule: {
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 6,
    overflow: "hidden",
  },
  rim: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    height: StyleSheet.hairlineWidth + 0.5,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 2,
  },
  iconSlot: {
    width: 48,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    // Soft lift so the count pops off the tab bar like a proper notification pill.
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  tabLabel: {
    fontSize: 10.5,
    fontFamily: "Inter_600SemiBold",
  },
  iconWrap: {
    width: 48,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    position: "absolute",
    width: 48,
    height: 30,
    borderRadius: 15,
  },
});
