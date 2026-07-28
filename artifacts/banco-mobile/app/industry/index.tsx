// Industry Hub — specs-first browse of industrial assets, filtered by
// industrial sub-type. Uses the public feed (no auth). Cards lead with text
// attributes, not photos.
import { Feather, MaterialCommunityIcons } from "@/components/icons";
import { FeedItem, useGetFeed } from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useState } from "react";
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
import {
  ALL_INDUSTRIAL_TYPES,
  IndustrialSubChips,
  IndustrialType,
} from "@/components/CategoryTabs";
import { IndustrialAssetCard } from "@/components/IndustrialAssetCard";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function IndustryHubScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";

  const [type, setType] = useState<IndustrialType>("all");
  // Origin dimension (الاستيراد): local vs imported — the supply section's core
  // split, filtered server-side like everything else.
  const [origin, setOrigin] = useState<"all" | "local" | "imported">("all");
  // Sub-type + origin are pushed to the SERVER (the feed supports both params),
  // so browsing is complete — no client-side filtering over a single page that
  // silently hides matches beyond the first fetch.
  const { data, isLoading, isError, refetch, isRefetching } = useGetFeed({
    category: "industrial",
    limit: 60,
    ...(type !== "all" ? { industrial_type: type } : {}),
    ...(origin !== "all" ? { origin_type: origin } : {}),
  });
  const items: FeedItem[] = data?.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
            flexDirection: rowDir,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.iconBtn}
          hitSlop={12}
          testID="industry-back"
        >
          <Feather
            name={isRTL ? "arrow-right" : "arrow-left"}
            size={22}
            color={colors.foreground}
          />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("industry.title")}
        </AppText>
        <Pressable
          onPress={() => router.push("/business/supply-hub")}
          style={styles.iconBtn}
          hitSlop={12}
          testID="industry-business-hub"
        >
          <Feather name="briefcase" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <IndustrialSubChips
        types={ALL_INDUSTRIAL_TYPES}
        selected={type}
        onChange={setType}
      />

      {/* Origin (الاستيراد): all / local / imported — the import dimension
          inside the section, same server filter search and the map use. */}
      <View style={[styles.originRow, { flexDirection: rowDir }]}>
        {(["all", "local", "imported"] as const).map((o) => {
          const active = origin === o;
          return (
            <Pressable
              key={o}
              onPress={() => setOrigin(o)}
              style={[
                styles.originChip,
                {
                  backgroundColor: active ? colors.primary : colors.secondary,
                },
              ]}
              testID={`industry-origin-${o}`}
            >
              <AppText
                style={[
                  styles.originChipText,
                  {
                    color: active
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                  },
                ]}
              >
                {o === "all"
                  ? t("search.any")
                  : t(`create.opts.${o}`)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.stateWrap}>
          <Feather name="wifi-off" size={52} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("industry.errorTitle")}
          </AppText>
          <Pressable
            onPress={() => refetch()}
            style={[
              styles.retryBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="industry-retry"
          >
            <Feather name="refresh-cw" size={16} color={colors.primaryForeground} />
            <AppText style={[styles.retryText, { color: colors.primaryForeground }]}>
              {t("industry.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.stateWrap}>
          <MaterialCommunityIcons
            name="factory"
            size={56}
            color={colors.mutedForeground}
          />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("industry.empty")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("industry.emptyHint")}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <IndustrialAssetCard
              item={item}
              onPress={(i) => router.push(`/listing/${i.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  stateTitle: {
    fontSize: 19,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
    textAlign: "center",
  },
  stateText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  retryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 },
  originRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  originChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  originChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
