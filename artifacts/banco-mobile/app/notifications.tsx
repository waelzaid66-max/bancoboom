import { Feather } from "@/components/icons";
import { useAuth } from "@clerk/expo";
import {
  useListNotifications,
  getListNotificationsQueryKey,
  markNotificationsRead,
  type Notification,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { routeForNotificationItem } from "@/lib/notificationRouting";

function relativeTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return locale === "ar" ? "الآن" : "now";
  if (min < 60) return locale === "ar" ? `${min} د` : `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return locale === "ar" ? `${hr} س` : `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return locale === "ar" ? `${day} ي` : `${day}d`;
  try {
    return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

type IconConfig = { name: keyof typeof Feather.glyphMap; color: string; bg: string };

function iconForType(type: Notification["type"], colors: ReturnType<typeof useColors>): IconConfig {
  switch (type) {
    case "message":
      return { name: "message-circle", color: colors.primary, bg: colors.secondary };
    case "lead":
      return { name: "trending-up", color: "#0a7", bg: "rgba(0,170,119,0.12)" };
    case "new_match":
      return { name: "search", color: colors.primary, bg: colors.secondary };
    case "price_drop":
      return { name: "tag", color: "#0a7", bg: "rgba(0,170,119,0.12)" };
    case "rfq":
      return { name: "file-text", color: colors.primary, bg: colors.secondary };
    case "comment":
      return { name: "message-square", color: colors.primary, bg: colors.secondary };
    case "review":
      return { name: "star", color: "#F5A623", bg: "rgba(245,166,35,0.12)" };
    case "booking":
      return { name: "calendar", color: colors.primary, bg: colors.secondary };
    case "car_import":
      return { name: "truck", color: "#0EA5E9", bg: "rgba(14,165,233,0.12)" };
    default:
      return { name: "bell", color: colors.mutedForeground, bg: colors.secondary };
  }
}

export default function NotificationsScreen() {
  const colors = useColors();
  const { t, isRTL, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 12 : insets.top;
  const rowDir = isRTL ? "row-reverse" : "row";

  const query = useListNotifications({
    query: {
      queryKey: getListNotificationsQueryKey(),
      enabled: !!isSignedIn,
      refetchInterval: 12000,
      refetchOnWindowFocus: true,
    },
  });

  const items: Notification[] = query.data?.data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
  }, [queryClient]);

  const handleMarkAll = useCallback(async () => {
    if (unread === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await markNotificationsRead({});
    } catch {
      // best-effort; refetch reflects server truth
    }
    invalidate();
  }, [unread, invalidate]);

  const handlePress = useCallback(
    async (n: Notification) => {
      if (!n.read_at) {
        markNotificationsRead({ id: n.id }).then(invalidate).catch(() => {});
      }
      const dest = routeForNotificationItem(n);
      if (dest) router.push(dest);
    },
    [invalidate]
  );

  const Header = (
    <View
      style={[
        styles.header,
        {
          paddingTop: topPad + 8,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
          flexDirection: rowDir,
        },
      ]}
    >
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
        hitSlop={12}
        style={styles.backBtn}
        testID="notifications-back"
      >
        <Feather
          name={isRTL ? "chevron-right" : "chevron-left"}
          size={26}
          color={colors.foreground}
        />
      </Pressable>
      <AppText style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
        {t("notifications.title")}
      </AppText>
      <View style={[styles.headerActions, { flexDirection: rowDir }]}>
        {unread > 0 ? (
          <Pressable onPress={handleMarkAll} hitSlop={8} testID="notifications-mark-all">
            <AppText style={[styles.markAll, { color: colors.primary }]}>
              {t("notifications.markAllRead")}
            </AppText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => router.push("/settings")}
          hitSlop={10}
          style={styles.backBtn}
          testID="notifications-settings"
        >
          <Feather name="settings" size={20} color={colors.foreground} />
        </Pressable>
      </View>
    </View>
  );

  if (!isSignedIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Header}
        <View style={styles.empty}>
          <Feather name="lock" size={56} color={colors.mutedForeground} />
          <AppText style={[styles.emptyTitle, { color: colors.foreground }]}>
            {t("notifications.signInTitle")}
          </AppText>
          <AppText style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {t("notifications.signInHint")}
          </AppText>
          <Pressable
            onPress={() => router.replace("/(tabs)/profile")}
            style={[
              styles.signInBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="notifications-signin"
          >
            <AppText style={[styles.signInText, { color: colors.primaryForeground }]}>
              {t("notifications.signInCta")}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  const renderRow = ({ item }: { item: Notification }) => {
    const isUnread = !item.read_at;
    const ic = iconForType(item.type, colors);
    return (
      <Pressable
        onPress={() => handlePress(item)}
        style={[
          styles.row,
          {
            flexDirection: rowDir,
            borderBottomColor: colors.border,
            backgroundColor: isUnread ? colors.secondary : colors.background,
          },
        ]}
        testID={`notification-${item.id}`}
      >
        <View style={[styles.iconWrap, { backgroundColor: ic.bg }]}>
          <Feather name={ic.name} size={20} color={ic.color} />
        </View>
        <View style={styles.rowMiddle}>
          <View style={[styles.rowTop, { flexDirection: rowDir }]}>
            <AppText
              style={[
                styles.rowTitle,
                {
                  color: colors.foreground,
                  textAlign: isRTL ? "right" : "left",
                  fontFamily: isUnread ? "Inter_700Bold" : "Inter_600SemiBold",
                },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </AppText>
            <AppText style={[styles.time, { color: colors.mutedForeground }]}>
              {relativeTime(item.created_at, lang)}
            </AppText>
          </View>
          <AppText
            style={[
              styles.body,
              {
                color: isUnread ? colors.foreground : colors.mutedForeground,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
            numberOfLines={2}
          >
            {item.body}
          </AppText>
        </View>
        {isUnread && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Header}
      {query.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : query.isError ? (
        <View style={styles.empty}>
          <Feather name="wifi-off" size={52} color={colors.mutedForeground} />
          <AppText style={[styles.emptyTitle, { color: colors.foreground }]}>
            {t("notifications.errorTitle")}
          </AppText>
          <Pressable
            onPress={() => query.refetch()}
            style={[
              styles.signInBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="notifications-retry"
          >
            <AppText style={[styles.signInText, { color: colors.primaryForeground }]}>
              {t("common.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="bell" size={56} color={colors.mutedForeground} />
          <AppText style={[styles.emptyTitle, { color: colors.foreground }]}>
            {t("notifications.empty")}
          </AppText>
          <AppText style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {t("notifications.emptyHint")}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
          windowSize={5}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  backBtn: { width: 40, height: 32, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold" },
  markAll: { fontSize: 13.5, fontFamily: "Inter_600SemiBold", paddingHorizontal: 4 },
  headerActions: { alignItems: "center", gap: 2 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingBottom: 60 },
  row: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  rowMiddle: { flex: 1, gap: 3 },
  rowTop: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowTitle: { fontSize: 15, flex: 1 },
  time: { fontSize: 12, fontFamily: "Inter_400Regular" },
  body: { fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 19 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginTop: 12,
    textAlign: "center",
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  signInBtn: { paddingHorizontal: 28, paddingVertical: 13, marginTop: 18 },
  signInText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
