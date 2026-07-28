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
import { usePathname, useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { BGlyph } from "@/components/BReactionButton";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

const isAndroid = Platform.OS === "android";
const isIOS = Platform.OS === "ios";
const isWeb = Platform.OS === "web";

// The five app destinations, mirroring the real (tabs) tab bar. `href` targets
// the group-transparent tab routes so tapping from a pushed mini-app screen pops
// back into the owning tab (expo-router resolves "/" → (tabs)/index, etc.).
const TABS: {
  key: string;
  href: string;
  icon: FeatherName;
  labelKey: string;
}[] = [
  { key: "index", href: "/", icon: "home", labelKey: "tabs.feed" },
  { key: "search", href: "/search", icon: "search", labelKey: "tabs.search" },
  {
    key: "messages",
    href: "/messages",
    icon: "message-circle",
    labelKey: "tabs.messages",
  },
  { key: "saved", href: "/saved", icon: "heart", labelKey: "tabs.saved" },
  { key: "profile", href: "/profile", icon: "user", labelKey: "tabs.profile" },
];

function useUnreadMessages(): number {
  const { isSignedIn } = useAuth();
  // Passive reader of the SHARED react-query cache — the real (tabs) tab bar
  // stays mounted beneath this pushed mini-app and owns the 15s polling. We
  // reuse its cached value here (no own refetchInterval) so the badge stays
  // live without doubling the network/battery cost during mini-app sessions.
  const { data } = useListConversations({
    query: {
      queryKey: getListConversationsQueryKey(),
      enabled: !!isSignedIn,
    },
  });
  return (data?.data ?? []).reduce((sum, c) => sum + (c.unread ?? 0), 0);
}

/**
 * Persistent bottom navigation for the section mini-apps (car / real-estate /
 * factories / materials / booking). Those screens are pushed as full-screen
 * stack routes ABOVE the (tabs) navigator, so the real capsule tab bar is not
 * mounted here. This mirror keeps the same five destinations reachable and the
 * app frame consistent, then jumps back into the tab that owns each destination.
 *
 * Visually it is the capsule tab bar with a HEAVIER (less transparent) glass —
 * requested specifically for the mini-apps so it reads as solid app chrome, not
 * a floating hint. Android avoids BlurView (it swallows touches on New Arch) and
 * relies on a near-opaque fill + elevation for the floating shadow.
 */
export function MiniAppBottomNav({
  lightened = false,
}: {
  /**
   * One notch MORE transparent while the user is actively inside the search
   * (input open). The bar never hides — it stays fixed and only its glass
   * lightens slightly, per the standing requirement ("يخف درجة زجاجيته سنة
   * فقط وقت الدخول على السيرش"). Everywhere else keeps the heavier glass.
   */
  lightened?: boolean;
}) {
  const colors = useColors();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const router = useRouter();
  const pathname = usePathname();
  const unread = useUnreadMessages();
  const { user } = useUser();
  const useBlur = isIOS;

  const go = (href: string) => {
    if (!isWeb) Haptics.selectionAsync();
    router.navigate(href as never);
  };

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
          {/* Heavier glass than the main tab bar: near-opaque so the mini-app
              chrome reads as solid. iOS keeps a strong BlurView; Android uses a
              near-solid gradient (Dimezis blur eats touches on New Arch). */}
          {useBlur ? (
            <BlurView
              pointerEvents="none"
              intensity={lightened ? (isDark ? 42 : 66) : isDark ? 60 : 90}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <LinearGradient
              pointerEvents="none"
              colors={
                lightened
                  ? isDark
                    ? ["rgba(28,28,33,0.88)", "rgba(16,16,20,0.90)"]
                    : ["rgba(255,255,255,0.88)", "rgba(244,244,247,0.90)"]
                  : isDark
                    ? ["rgba(28,28,33,0.99)", "rgba(16,16,20,1)"]
                    : ["rgba(255,255,255,0.99)", "rgba(244,244,247,0.99)"]
              }
              style={StyleSheet.absoluteFill}
            />
          )}
          {useBlur ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isDark
                    ? lightened
                      ? "rgba(22,22,26,0.55)"
                      : "rgba(22,22,26,0.72)"
                    : lightened
                      ? "rgba(255,255,255,0.55)"
                      : "rgba(255,255,255,0.72)",
                },
              ]}
            />
          ) : null}
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
          {TABS.map((tab) => {
            const focused =
              pathname === tab.href ||
              (tab.href === "/" && pathname === "/index");
            const tint = focused ? colors.primary : colors.mutedForeground;
            const isProfile = tab.key === "profile";
            const showBadge = tab.key === "messages" && unread > 0;
            return (
              <Pressable
                key={tab.key}
                onPress={() => go(tab.href)}
                style={styles.tab}
                accessibilityRole="button"
                accessibilityLabel={t(tab.labelKey)}
                testID={`miniapp-tab-${tab.key}`}
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
                  ) : tab.key === "saved" ? (
                    <View style={{ opacity: focused ? 1 : 0.45 }}>
                      <BGlyph height={30} />
                    </View>
                  ) : (
                    <Feather name={tab.icon} size={22} color={tint} />
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
                <AppText
                  numberOfLines={1}
                  style={[styles.tabLabel, { color: tint }]}
                >
                  {t(tab.labelKey)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
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
});
