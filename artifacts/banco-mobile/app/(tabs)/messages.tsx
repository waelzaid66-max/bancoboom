import { Feather } from "@/components/icons";
import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListConversations,
  useDeleteConversation,
  getListConversationsQueryKey,
  type ConversationSummary,
} from "@workspace/api-client-react";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { SkeletonBlock } from "@/components/SkeletonCard";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

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

export default function MessagesScreen() {
  const colors = useColors();
  const { t, isRTL, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";

  const query = useListConversations({
    query: {
      queryKey: getListConversationsQueryKey(),
      enabled: !!isSignedIn,
      refetchInterval: 8000,
      refetchOnWindowFocus: true,
    },
  });

  const conversations: ConversationSummary[] = query.data?.data ?? [];
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread ?? 0), 0);

  const qc = useQueryClient();
  const deleteMut = useDeleteConversation();

  // Long-press to soft-hide a thread for this user only (see backend un-hide).
  const handleDelete = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t("messages.deleteTitle"), t("messages.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          deleteMut.mutate(
            { id },
            {
              onSuccess: () =>
                qc.invalidateQueries({
                  queryKey: getListConversationsQueryKey(),
                }),
              onError: () =>
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error
                ),
            }
          );
        },
      },
    ]);
  }, [t, deleteMut, qc]);

  const Header = (
    <View
      style={[
        styles.header,
        {
          paddingTop: topPad + 14,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
          flexDirection: rowDir,
        },
      ]}
    >
      <AppText style={[styles.title, { color: colors.foreground }]}>
        {t("messages.title")}
      </AppText>
      {totalUnread > 0 && (
        <View
          style={[
            styles.countBadge,
            { backgroundColor: colors.primary, borderRadius: 12 },
          ]}
        >
          <AppText style={[styles.countText, { color: colors.primaryForeground }]}>
            {totalUnread}
          </AppText>
        </View>
      )}
    </View>
  );

  if (!isSignedIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Header}
        <View style={styles.empty}>
          <Feather name="lock" size={56} color={colors.mutedForeground} />
          <AppText style={[styles.emptyTitle, { color: colors.foreground }]}>
            {t("messages.signInTitle")}
          </AppText>
          <AppText style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {t("messages.signInHint")}
          </AppText>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            style={[
              styles.signInBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="messages-signin"
          >
            <AppText style={[styles.signInText, { color: colors.primaryForeground }]}>
              {t("messages.signInCta")}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  const renderRow = useCallback(({ item }: { item: ConversationSummary }) => {
    const unread = item.unread > 0;
    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/messages/[id]",
            params: {
              id: item.id,
              name: item.counterparty_name,
              listingId: item.listing_id,
              role: item.viewer_role,
            },
          })
        }
        onLongPress={() => handleDelete(item.id)}
        delayLongPress={350}
        style={[
          styles.row,
          {
            flexDirection: rowDir,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
        testID={`conversation-${item.id}`}
      >
        <View style={[styles.thumbWrap, { backgroundColor: colors.secondary }]}>
          {item.listing_thumb ? (
            <Image
              source={{ uri: item.listing_thumb }}
              style={styles.thumb}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <Feather name="image" size={20} color={colors.mutedForeground} />
          )}
        </View>
        <View style={styles.rowMiddle}>
          <View style={[styles.rowTop, { flexDirection: rowDir }]}>
            <AppText
              style={[
                styles.name,
                {
                  color: colors.foreground,
                  textAlign: isRTL ? "right" : "left",
                  fontFamily: unread ? "Inter_700Bold" : "Inter_600SemiBold",
                },
              ]}
              numberOfLines={1}
            >
              {item.counterparty_name}
            </AppText>
            <AppText style={[styles.time, { color: colors.mutedForeground }]}>
              {relativeTime(item.last_message_at, lang)}
            </AppText>
          </View>
          {item.listing_title ? (
            <AppText
              style={[
                styles.listingTitle,
                { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
              ]}
              numberOfLines={1}
            >
              {item.listing_title}
            </AppText>
          ) : null}
          <View style={[styles.rowBottom, { flexDirection: rowDir }]}>
            <AppText
              style={[
                styles.preview,
                {
                  color: unread ? colors.foreground : colors.mutedForeground,
                  textAlign: isRTL ? "right" : "left",
                  fontFamily: unread ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
              numberOfLines={1}
            >
              {item.last_message_text || t("messages.noMessages")}
            </AppText>
            {unread && (
              <View
                style={[styles.unreadDot, { backgroundColor: colors.primary }]}
              >
                <AppText
                  style={[styles.unreadText, { color: colors.primaryForeground }]}
                >
                  {item.unread}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }, [rowDir, colors, handleDelete, isRTL, lang, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Header}
      {query.isLoading ? (
        <View style={styles.list}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={[styles.row, { borderBottomColor: colors.border }]}>
              <SkeletonBlock width={52} height={52} borderRadius={26} />
              <View style={styles.rowMiddle}>
                <SkeletonBlock width="55%" height={15} />
                <SkeletonBlock width="80%" height={12} style={{ marginTop: 6 }} />
              </View>
            </View>
          ))}
        </View>
      ) : query.isError ? (
        <View style={styles.empty}>
          <Feather name="wifi-off" size={52} color={colors.mutedForeground} />
          <AppText style={[styles.emptyTitle, { color: colors.foreground }]}>
            {t("messages.errorTitle")}
          </AppText>
          <Pressable
            onPress={() => query.refetch()}
            style={[
              styles.signInBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="messages-retry"
          >
            <AppText style={[styles.signInText, { color: colors.primaryForeground }]}>
              {t("common.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="message-circle" size={56} color={colors.mutedForeground} />
          <AppText style={[styles.emptyTitle, { color: colors.foreground }]}>
            {t("messages.empty")}
          </AppText>
          <AppText style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {t("messages.emptyHint")}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          windowSize={5}
          maxToRenderPerBatch={8}
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
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3 },
  countText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingBottom: 120 },
  row: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumb: { width: 52, height: 52 },
  rowMiddle: { flex: 1, gap: 2 },
  rowTop: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { fontSize: 15.5, flex: 1 },
  time: { fontSize: 12, fontFamily: "Inter_400Regular" },
  listingTitle: { fontSize: 12.5, fontFamily: "Inter_400Regular" },
  rowBottom: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  preview: { fontSize: 14, flex: 1 },
  unreadDot: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { fontSize: 11, fontFamily: "Inter_700Bold" },
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
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  signInBtn: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    marginTop: 18,
  },
  signInText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
