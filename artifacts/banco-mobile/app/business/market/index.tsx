// Market intelligence (Task #40). Every trend is computed LIVE from real
// listings/interactions/leads. When direction or data_quality is "insufficient"
// we render an honest "not enough data" state — never a fabricated number.
// period_label + generated_at carry provenance.
import { Feather, MaterialCommunityIcons } from "@/components/icons";
import {
  GetMarketTrendsCategory,
  MarketTrend,
  MarketTrendsResult,
  useGetMarketTrends,
} from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

type Colors = ReturnType<typeof useColors>;
type T = (k: string, vars?: Record<string, string | number>) => string;

const CATEGORY_FILTERS: (GetMarketTrendsCategory | "all")[] = [
  "all",
  "car",
  "real_estate",
  "industrial",
];

function directionVisual(direction: MarketTrend["direction"], colors: Colors) {
  switch (direction) {
    case "up":
      return { icon: "trending-up" as const, color: colors.primary };
    case "down":
      return { icon: "trending-down" as const, color: colors.destructive };
    case "stable":
      return { icon: "minus" as const, color: colors.mutedForeground };
    default:
      return { icon: "help-circle" as const, color: colors.mutedForeground };
  }
}

export default function MarketScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign: "left" | "right" = isRTL ? "right" : "left";

  const [category, setCategory] = useState<GetMarketTrendsCategory | "all">("all");
  const params = category === "all" ? undefined : { category };
  const { data, isLoading, isError, refetch, isRefetching } = useGetMarketTrends(params);
  const result = data?.data as MarketTrendsResult | undefined;

  const Header = (
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
        testID="market-back"
      >
        <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={colors.foreground} />
      </Pressable>
      <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
        {t("business.market.title")}
      </AppText>
      <View style={styles.iconBtn} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Header}

      <View style={[styles.filterRow, { flexDirection: rowDir }]}>
        {CATEGORY_FILTERS.map((c) => {
          const active = category === c;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : colors.secondary,
                  borderColor: active ? colors.primary : colors.border,
                  borderRadius: colors.radius,
                },
              ]}
              testID={`market-filter-${c}`}
            >
              <AppText
                style={[
                  styles.filterText,
                  { color: active ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {c === "all" ? t("business.market.allCategories") : t(`business.cat.${c}`)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError || !result ? (
        <View style={styles.stateWrap}>
          <Feather name="wifi-off" size={52} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("business.common.loadError")}
          </AppText>
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            testID="market-retry"
          >
            <AppText style={[styles.retryText, { color: colors.primaryForeground }]}>
              {t("business.common.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={undefined}
        >
          <View
            style={[styles.provenance, { backgroundColor: colors.card, borderRadius: colors.radius }]}
          >
            <View style={[styles.provRow, { flexDirection: rowDir }]}>
              <Feather name="calendar" size={13} color={colors.mutedForeground} />
              <AppText style={[styles.provText, { color: colors.mutedForeground, textAlign }]}>
                {result.period_label}
              </AppText>
            </View>
            <View style={[styles.provRow, { flexDirection: rowDir }]}>
              <Feather name="clock" size={13} color={colors.mutedForeground} />
              <AppText style={[styles.provText, { color: colors.mutedForeground, textAlign }]}>
                {t("business.market.generatedAt")}: {result.generated_at}
              </AppText>
            </View>
          </View>

          {result.trends.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="chart-line" size={52} color={colors.mutedForeground} />
              <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
                {t("business.market.empty")}
              </AppText>
            </View>
          ) : (
            result.trends.map((trend, i) => (
              <TrendCard
                key={`${trend.segment}-${trend.metric}-${i}`}
                trend={trend}
                colors={colors}
                t={t}
                rowDir={rowDir}
                textAlign={textAlign}
              />
            ))
          )}

          {isRefetching ? (
            <ActivityIndicator color={colors.primary} style={styles.refreshing} />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function TrendCard({
  trend,
  colors,
  t,
  rowDir,
  textAlign,
}: {
  trend: MarketTrend;
  colors: Colors;
  t: T;
  rowDir: "row" | "row-reverse";
  textAlign: "left" | "right";
}) {
  const insufficient =
    trend.direction === "insufficient" || trend.data_quality === "insufficient";
  const visual = directionVisual(trend.direction, colors);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
      <View style={[styles.cardTop, { flexDirection: rowDir }]}>
        <AppText style={[styles.segment, { color: colors.foreground, textAlign }]} numberOfLines={1}>
          {trend.segment_label}
        </AppText>
        <View
          style={[
            styles.qualityPill,
            { backgroundColor: colors.secondary, borderRadius: 20 },
          ]}
        >
          <AppText style={[styles.qualityText, { color: colors.mutedForeground }]}>
            {t(`business.market.quality.${trend.data_quality}`)}
          </AppText>
        </View>
      </View>

      <AppText style={[styles.metric, { color: colors.mutedForeground, textAlign }]}>
        {t(`business.market.metric.${trend.metric}`)}
      </AppText>

      {insufficient ? (
        <View style={[styles.insufficient, { flexDirection: rowDir }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <AppText style={[styles.insufficientText, { color: colors.mutedForeground, textAlign }]}>
            {t("business.market.insufficient")}
          </AppText>
        </View>
      ) : (
        <View style={[styles.valueRow, { flexDirection: rowDir }]}>
          {trend.current_value_display ? (
            <AppText style={[styles.value, { color: colors.foreground }]}>
              {trend.current_value_display}
            </AppText>
          ) : null}
          <View style={[styles.changeBadge, { backgroundColor: visual.color + "1A", flexDirection: rowDir }]}>
            <Feather name={visual.icon} size={14} color={visual.color} />
            <AppText style={[styles.changeText, { color: visual.color }]}>
              {trend.change_display}
            </AppText>
          </View>
        </View>
      )}

      <AppText style={[styles.sample, { color: colors.mutedForeground, textAlign }]}>
        {trend.sample_size} {t("business.market.sampleLabel")}
      </AppText>
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
  filterRow: { flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  stateWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  stateTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center", marginTop: 6 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 14 },
  retryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 16, paddingBottom: 120 },
  provenance: { padding: 12, gap: 6, marginBottom: 14 },
  provRow: { alignItems: "center", gap: 7 },
  provText: { flex: 1, fontSize: 12.5, fontFamily: "Inter_400Regular" },
  emptyWrap: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 60 },
  card: { padding: 14, marginBottom: 12, gap: 8 },
  cardTop: { alignItems: "center", justifyContent: "space-between", gap: 10 },
  segment: { flex: 1, fontSize: 15.5, fontFamily: "Inter_600SemiBold" },
  qualityPill: { paddingHorizontal: 9, paddingVertical: 4 },
  qualityText: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
  metric: { fontSize: 13, fontFamily: "Inter_400Regular" },
  valueRow: { alignItems: "center", gap: 10, flexWrap: "wrap" },
  value: { fontSize: 18, fontFamily: "Inter_700Bold" },
  changeBadge: { alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  changeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  insufficient: { alignItems: "flex-start", gap: 7, marginTop: 2 },
  insufficientText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  sample: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  refreshing: { marginTop: 8 },
});
