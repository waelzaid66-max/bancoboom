import { Feather } from "@/components/icons";
import { getListing, FeedItem } from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { SmartAssetCard } from "@/components/SmartAssetCard";
import { useI18n } from "@/context/LanguageContext";
import {
  SavedItem,
  SavedSearch,
  useSession,
} from "@/context/SessionContext";
import { useColors } from "@/hooks/useColors";

type PriceTrend = "down" | "up" | null;

function parsePrice(display?: string | null): number | null {
  if (!display) return null;
  const match = display.replace(/,/g, "").match(/([\d.]+)\s*([MK]?)/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return null;
  const suffix = match[2]?.toUpperCase();
  if (suffix === "M") return value * 1_000_000;
  if (suffix === "K") return value * 1_000;
  return value;
}

function priceTrend(savedDisplay?: string, freshDisplay?: string): PriceTrend {
  const before = parsePrice(savedDisplay);
  const after = parsePrice(freshDisplay);
  if (before === null || after === null) return null;
  if (after < before) return "down";
  if (after > before) return "up";
  return null;
}

export default function SavedScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const { savedItems, toggleSave, savedSearches, removeSearch } = useSession();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";

  // Fresh price_display per saved listing, fetched live to surface changes
  // against the price snapshot stored at save time.
  const [freshPrices, setFreshPrices] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (savedItems.length === 0) {
      setFreshPrices({});
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    (async () => {
      const entries = await Promise.all(
        savedItems.map(async (item) => {
          try {
            const res = await getListing(item.id);
            return [item.id, res.data?.price_display] as const;
          } catch {
            return [item.id, undefined] as const;
          }
        })
      );
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const [id, price] of entries) {
        if (price) map[id] = price;
      }
      setFreshPrices(map);
      setRefreshing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [savedItems]);

  const totalSaved = savedItems.length + savedSearches.length;

  // Sort once, not on every render — avoids re-sorting the array each frame.
  const sortedItems = useMemo(
    () => [...savedItems].sort((a, b) => b.savedAt - a.savedAt),
    [savedItems],
  );
  const sortedSearches = useMemo(
    () => [...savedSearches].sort((a, b) => b.savedAt - a.savedAt),
    [savedSearches],
  );

  const renderSearch = (search: SavedSearch) => {
    const chips: string[] = [];
    if (search.category !== "all") {
      chips.push(t(`home.categories.${search.category}`));
    }
    if (search.location.trim()) chips.push(search.location.trim());
    if (search.minPrice || search.maxPrice) {
      const min = search.minPrice || "0";
      chips.push(search.maxPrice ? `${min} - ${search.maxPrice}` : `${min}+`);
    }
    if (search.paymentType === "installment") {
      chips.push(t("search.installmentOnly"));
    }

    return (
      <View
        key={search.id}
        style={[
          styles.searchCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
            flexDirection: rowDir,
          },
        ]}
      >
        <Pressable
          style={[styles.searchMain, { flexDirection: rowDir }]}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/search",
              params: {
                q: search.q,
                category: search.category,
                minPrice: search.minPrice,
                maxPrice: search.maxPrice,
                location: search.location,
                paymentType: search.paymentType,
                ts: String(Date.now()),
              },
            })
          }
        >
          <View
            style={[styles.searchIcon, { backgroundColor: colors.secondary }]}
          >
            <Feather name="search" size={16} color={colors.primary} />
          </View>
          <View style={styles.searchTextWrap}>
            <AppText
              style={[
                styles.searchQuery,
                { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
              ]}
              numberOfLines={1}
            >
              {search.q || t("search.placeholder")}
            </AppText>
            {chips.length > 0 && (
              <AppText
                style={[
                  styles.searchMeta,
                  {
                    color: colors.mutedForeground,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                numberOfLines={1}
              >
                {chips.join(" · ")}
              </AppText>
            )}
          </View>
        </Pressable>
        <Pressable
          onPress={() => removeSearch(search.id)}
          hitSlop={10}
          style={styles.searchRemove}
          testID={`remove-search-${search.id}`}
        >
          <Feather name="x" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>
    );
  };

  const renderListing = useCallback((item: SavedItem) => {
    const fresh = freshPrices[item.id];
    const trend = priceTrend(item.price_display, fresh);
    const cardItem: FeedItem = fresh
      ? { ...item, price_display: fresh }
      : item;

    return (
      <View>
        {trend && (
          <View
            style={[
              styles.priceBadge,
              {
                alignSelf: isRTL ? "flex-end" : "flex-start",
                backgroundColor:
                  trend === "down"
                    ? colors.primary + "22"
                    : colors.destructive + "22",
                flexDirection: rowDir,
              },
            ]}
          >
            <Feather
              name={trend === "down" ? "trending-down" : "trending-up"}
              size={12}
              color={trend === "down" ? colors.primary : colors.destructive}
            />
            <AppText
              style={[
                styles.priceBadgeText,
                {
                  color:
                    trend === "down" ? colors.primary : colors.destructive,
                },
              ]}
            >
              {trend === "down" ? t("saved.priceDropped") : t("saved.priceUp")}
            </AppText>
          </View>
        )}
        <SmartAssetCard
          item={cardItem}
          onPress={(i) => router.push(`/listing/${i.id}`)}
          onSave={toggleSave}
          isSaved
        />
      </View>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshPrices, isRTL, rowDir, colors, t, toggleSave]);

  const renderFlatItem = useCallback(
    ({ item }: { item: SavedItem }) => renderListing(item),
    [renderListing],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          {t("saved.title")}
        </AppText>
        {totalSaved > 0 && (
          <View
            style={[
              styles.countBadge,
              { backgroundColor: colors.primary, borderRadius: 12 },
            ]}
          >
            <AppText
              style={[styles.countText, { color: colors.primaryForeground }]}
            >
              {totalSaved}
            </AppText>
          </View>
        )}
        {refreshing && savedItems.length > 0 && (
          <View style={[styles.refreshHint, { flexDirection: rowDir }]}>
            <ActivityIndicator size="small" color={colors.mutedForeground} />
            <AppText
              style={[styles.refreshHintText, { color: colors.mutedForeground }]}
            >
              {t("saved.checkingPrices")}
            </AppText>
          </View>
        )}
      </View>

      {totalSaved === 0 ? (
        <View style={styles.empty}>
          <Feather name="heart" size={56} color={colors.mutedForeground} />
          <AppText style={[styles.emptyTitle, { color: colors.foreground }]}>
            {t("saved.empty")}
          </AppText>
          <AppText style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {t("saved.emptyHint")}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={sortedItems}
          keyExtractor={(item) => item.id}
          renderItem={renderFlatItem}
          windowSize={5}
          maxToRenderPerBatch={6}
          initialNumToRender={6}
          removeClippedSubviews
          ListHeaderComponent={
            savedSearches.length > 0 ? (
              <View style={styles.searchesSection}>
                <AppText
                  style={[
                    styles.sectionLabel,
                    {
                      color: colors.mutedForeground,
                      textAlign: isRTL ? "right" : "left",
                    },
                  ]}
                >
                  {t("saved.searches")}
                </AppText>
                {sortedSearches.map(renderSearch)}
                {savedItems.length > 0 && (
                  <AppText
                    style={[
                      styles.sectionLabel,
                      {
                        color: colors.mutedForeground,
                        marginTop: 18,
                        textAlign: isRTL ? "right" : "left",
                      },
                    ]}
                  >
                    {t("saved.listings")}
                  </AppText>
                )}
              </View>
            ) : null
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  refreshHint: {
    alignItems: "center",
    gap: 6,
  },
  refreshHintText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  searchesSection: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  searchCard: {
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 8,
  },
  searchMain: {
    flex: 1,
    alignItems: "center",
    gap: 12,
  },
  searchIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  searchTextWrap: {
    flex: 1,
  },
  searchQuery: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  searchMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  searchRemove: {
    padding: 4,
  },
  priceBadge: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  priceBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
