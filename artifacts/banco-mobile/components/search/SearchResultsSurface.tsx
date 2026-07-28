import { FeedItem } from "@workspace/api-client-react";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Feather } from "@/components/icons";
import { AppText } from "@/components/AppText";
import { SmartAssetCard } from "@/components/SmartAssetCard";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface SearchResultsSurfaceProps {
  items: FeedItem[];
  onCardPress: (item: FeedItem) => void;
  onSave?: (item: FeedItem) => void;
  isSaved: (id: string) => boolean;
  onEndReached: () => void;
  /** Appending the next page → footer spinner. */
  loadingMore: boolean;
  /** Re-querying while results stay visible → subtle top indicator. */
  refreshing: boolean;
  /**
   * A re-query FAILED while results are still on screen. The list keeps the
   * earlier rows (never wiped); we surface a small, non-blocking banner with a
   * retry affordance so the surface never silently lies about being fresh.
   */
  error?: boolean;
  onRetry?: () => void;
  /**
   * Pull-to-refresh: re-run the current query in place. Optional — when set, a
   * RefreshControl whose spinner is bound to the `refreshing` phase is attached.
   * Omitted on surfaces where the host owns refresh (e.g. embedded overlays).
   */
  onRefresh?: () => void;
  /**
   * Overlay rendered above the (always-mounted) list for the non-results states
   * (discover / blocking-load / error / empty). When null the list is shown.
   */
  overlay: React.ReactNode;
  contentPaddingBottom?: number;
  /**
   * Card renderer override. Defaults to SmartAssetCard; the Booking & Stays
   * mini-app passes StayCard so it can render stay cards without duplicating
   * the list machinery (virtualization, entrance animation, refresh, footer).
   */
  CardComponent?: React.ComponentType<{
    item: FeedItem;
    onPress?: (item: FeedItem) => void;
    onSave?: (item: FeedItem) => void;
    isSaved?: boolean;
  }>;
}

/**
 * The single, permanently-mounted results surface for the Search mini-app. The
 * FlatList is NEVER unmounted — non-results states render as an absolute overlay
 * sibling on top of it. This is what makes live typing flicker-free: the list
 * keeps its scroll position and its previous rows while a new query refreshes,
 * and we never pay the cost of remounting the virtualized list between states.
 *
 * Search-only polish: each result card fades/rises in the first time its id is
 * seen this session. A seen-id guard means scrolling a row out of and back into
 * the window never re-triggers the animation, so the no-flicker guarantee holds.
 */
export function SearchResultsSurface({
  items,
  onCardPress,
  onSave,
  isSaved,
  onEndReached,
  loadingMore,
  refreshing,
  error,
  onRetry,
  onRefresh,
  overlay,
  contentPaddingBottom = 120,
  CardComponent,
}: SearchResultsSurfaceProps) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const Card = CardComponent ?? SmartAssetCard;

  // Ids that have already played their entrance animation. We only ever add, so
  // each card animates exactly once per surface lifetime — remounts during
  // virtualized scrolling read `undefined` for `entering` and stay still.
  const seenIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const it of items) seenIds.current.add(it.id);
  }, [items]);

  const showBanner = !!error && !overlay && items.length > 0;

  return (
    <View style={styles.fill}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const firstAppearance = !seenIds.current.has(item.id);
          return (
            <Animated.View
              entering={
                firstAppearance ? FadeInDown.duration(220) : undefined
              }
            >
              <Card
                item={item}
                onPress={onCardPress}
                onSave={onSave}
                isSaved={isSaved(item.id)}
              />
            </Animated.View>
          );
        }}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: contentPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        scrollEnabled={items.length > 0}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          ) : undefined
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.mutedForeground} />
            </View>
          ) : null
        }
      />

      {refreshing && !overlay ? (
        <View style={styles.refreshBar}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}

      {showBanner ? (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <Feather name="wifi-off" size={15} color={colors.mutedForeground} />
          <AppText
            style={[styles.errorBannerText, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {t("search.refreshFailed")}
          </AppText>
          <Pressable
            onPress={onRetry}
            hitSlop={8}
            style={[
              styles.errorBannerBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="search-refresh-retry"
          >
            <AppText
              style={[
                styles.errorBannerBtnText,
                { color: colors.primaryForeground },
              ]}
            >
              {t("search.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {overlay ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.background },
          ]}
        >
          {overlay}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  footer: {
    paddingVertical: 20,
  },
  refreshBar: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  },
  errorBanner: {
    position: "absolute",
    top: 8,
    left: 12,
    right: 12,
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12.5,
  },
  errorBannerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  errorBannerBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
