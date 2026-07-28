// Dealer Analytics — read-only performance overview for sellers/dealers.
// Stats come straight from getDealerAnalytics(); the optional "Spend &
// efficiency" block is best-effort (summed from real wallet charges) and must
// NEVER block or fail the stats view. No fabricated numbers anywhere: a tile is
// only rendered when its underlying value is actually present.
import { Feather, MaterialCommunityIcons } from "@/components/icons";
import {
  getDealerAnalytics,
  listTransactions,
  type DealerStats,
  type WalletTransactionType,
} from "@workspace/api-client-react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

type LoadState = "loading" | "ready" | "error" | "restricted";
type FeatherName = React.ComponentProps<typeof Feather>["name"];

const SPEND_TYPES: WalletTransactionType[] = [
  "boost_charge",
  "subscription_charge",
  "lead_charge",
];
const TX_PAGE = 50;
const MAX_TX_PAGES = 6;
const TREND_DAYS = 14;

function fmtNum(value: number | null | undefined): string {
  if (value === null || value === undefined || !isFinite(value)) return "0";
  return value.toLocaleString();
}

function fmtMoney(value: number): string {
  if (!isFinite(value)) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// conversion_rate is a free-form string from the API. Append "%" only when it is
// numeric and not already present — never invent a value.
function conversionLabel(raw: string | null | undefined): string | null {
  const cr = raw?.trim();
  if (!cr) return null;
  if (cr.includes("%")) return cr;
  return isFinite(parseFloat(cr)) ? `${cr}%` : cr;
}

export default function DealerAnalyticsScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir: "row" | "row-reverse" = isRTL ? "row-reverse" : "row";
  const textAlign: "left" | "right" = isRTL ? "right" : "left";
  const egp = t("common.egp");

  const [state, setState] = useState<LoadState>("loading");
  const [stats, setStats] = useState<DealerStats | null>(null);
  const [spend, setSpend] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadSpend = useCallback(async () => {
    // Best-effort: a spend-fetch failure must NEVER block or fail the stats view.
    try {
      let cursor: string | null = null;
      let total = 0;
      for (let page = 0; page < MAX_TX_PAGES; page++) {
        const res = await listTransactions(
          cursor ? { limit: TX_PAGE, cursor } : { limit: TX_PAGE },
        );
        for (const tx of res.data ?? []) {
          if (SPEND_TYPES.includes(tx.type)) {
            total += Math.abs(parseFloat(tx.amount) || 0);
          }
        }
        if (!res.meta?.has_next || !res.meta?.cursor) break;
        cursor = res.meta.cursor;
      }
      setSpend(total);
    } catch {
      setSpend(null);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await getDealerAnalytics();
      setStats(res.data ?? null);
      setState("ready");
      loadSpend();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setState(status === 401 || status === 403 ? "restricted" : "error");
    }
  }, [loadSpend]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setSpend(null);
    await load();
    setRefreshing(false);
  }, [load]);

  const tiles: { key: string; icon: FeatherName; label: string; value: string }[] =
    [];
  if (stats) {
    if (stats.active_listings != null)
      tiles.push({
        key: "active",
        icon: "tag",
        label: t("business.analytics.activeListings"),
        value: fmtNum(stats.active_listings),
      });
    if (stats.total_listings != null)
      tiles.push({
        key: "total",
        icon: "list",
        label: t("business.analytics.totalListings"),
        value: fmtNum(stats.total_listings),
      });
    if (stats.total_views != null)
      tiles.push({
        key: "views",
        icon: "eye",
        label: t("business.analytics.totalViews"),
        value: fmtNum(stats.total_views),
      });
    if (stats.leads_today != null)
      tiles.push({
        key: "leads",
        icon: "phone",
        label: t("business.analytics.leadsToday"),
        value: fmtNum(stats.leads_today),
      });
    const conv = conversionLabel(stats.conversion_rate);
    if (conv)
      tiles.push({
        key: "conv",
        icon: "trending-up",
        label: t("business.analytics.conversion"),
        value: conv,
      });
  }

  const chart = (stats?.leads_chart ?? []).slice(-TREND_DAYS);
  const hasChart = chart.length > 0;
  const maxLeads = Math.max(1, ...chart.map((d) => d.leads ?? 0));
  const leadsBasis =
    chart.reduce((s, d) => s + (d.leads ?? 0), 0) || (stats?.leads_today ?? 0);

  const showSpend = spend != null && spend > 0 && leadsBasis > 0;
  const costPerLead = showSpend ? (spend as number) / leadsBasis : 0;

  const hasAnyStat = tiles.length > 0 || hasChart;

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
          testID="analytics-back"
        >
          <Feather
            name={isRTL ? "arrow-right" : "arrow-left"}
            size={22}
            color={colors.foreground}
          />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("business.analytics.title")}
        </AppText>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleRefresh();
          }}
          style={styles.iconBtn}
          hitSlop={12}
          testID="analytics-refresh"
        >
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {state === "loading" ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : state === "restricted" ? (
        <View style={styles.stateWrap}>
          <MaterialCommunityIcons
            name="store-outline"
            size={56}
            color={colors.mutedForeground}
          />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("profile.becomeBusiness")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("profile.becomeBusinessHint")}
          </AppText>
          <Pressable
            onPress={() => router.push("/business/onboarding")}
            style={[
              styles.cta,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="analytics-become-business"
          >
            <MaterialCommunityIcons
              name="storefront-outline"
              size={16}
              color={colors.primaryForeground}
            />
            <AppText style={[styles.ctaText, { color: colors.primaryForeground }]}>
              {t("profile.becomeBusiness")}
            </AppText>
          </Pressable>
        </View>
      ) : state === "error" ? (
        <View style={styles.stateWrap}>
          <Feather name="wifi-off" size={52} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("business.analytics.errorTitle")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("business.analytics.errorHint")}
          </AppText>
          <Pressable
            onPress={() => {
              setState("loading");
              load();
            }}
            style={[
              styles.cta,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="analytics-retry"
          >
            <Feather name="refresh-cw" size={16} color={colors.primaryForeground} />
            <AppText style={[styles.ctaText, { color: colors.primaryForeground }]}>
              {t("common.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : !hasAnyStat ? (
        <View style={styles.stateWrap}>
          <MaterialCommunityIcons
            name="chart-box-outline"
            size={52}
            color={colors.mutedForeground}
          />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("business.analytics.emptyTitle")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("business.analytics.emptyHint")}
          </AppText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <AppText
            style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}
          >
            {t("business.analytics.overview")}
          </AppText>
          <View style={styles.tileGrid}>
            {tiles.map((tile) => (
              <View
                key={tile.key}
                style={[
                  styles.tile,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <View
                  style={[styles.tileIcon, { backgroundColor: colors.primary + "1A" }]}
                >
                  <Feather name={tile.icon} size={18} color={colors.primary} />
                </View>
                <AppText style={[styles.tileValue, { color: colors.foreground }]}>
                  {tile.value}
                </AppText>
                <AppText
                  style={[styles.tileLabel, { color: colors.mutedForeground }]}
                  numberOfLines={2}
                >
                  {tile.label}
                </AppText>
              </View>
            ))}
          </View>

          {hasChart ? (
            <View
              style={[
                styles.block,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <AppText
                style={[styles.blockTitle, { color: colors.foreground, textAlign }]}
              >
                {t("business.analytics.trend")}
              </AppText>
              <View style={[styles.chartRow, { flexDirection: rowDir }]}>
                {chart.map((d, i) => {
                  const v = d.leads ?? 0;
                  const h = Math.max(4, Math.round((v / maxLeads) * 72));
                  return (
                    <View key={`${d.date ?? i}`} style={styles.chartCol}>
                      {chart.length <= 10 ? (
                        <AppText
                          style={[styles.chartVal, { color: colors.mutedForeground }]}
                        >
                          {v}
                        </AppText>
                      ) : null}
                      <View
                        style={[
                          styles.bar,
                          { height: h, backgroundColor: colors.primary },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {showSpend ? (
            <View
              style={[
                styles.block,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={[styles.blockHead, { flexDirection: rowDir }]}>
                <MaterialCommunityIcons
                  name="chart-box-outline"
                  size={18}
                  color={colors.primary}
                />
                <AppText style={[styles.blockTitle, { color: colors.foreground }]}>
                  {t("business.analytics.spendTitle")}
                </AppText>
              </View>
              <View style={[styles.spendRow, { flexDirection: rowDir }]}>
                <Feather name="credit-card" size={15} color={colors.mutedForeground} />
                <AppText
                  style={[styles.spendLabel, { color: colors.mutedForeground }]}
                >
                  {t("business.analytics.recentSpend")}
                </AppText>
                <AppText style={[styles.spendValue, { color: colors.foreground }]}>
                  {fmtMoney(spend as number)} {egp}
                </AppText>
              </View>
              <View style={[styles.spendRow, { flexDirection: rowDir }]}>
                <Feather name="trending-up" size={15} color={colors.mutedForeground} />
                <AppText
                  style={[styles.spendLabel, { color: colors.mutedForeground }]}
                >
                  {t("business.analytics.costPerLead")}
                </AppText>
                <AppText style={[styles.spendValue, { color: colors.foreground }]}>
                  ≈ {fmtMoney(costPerLead)} {egp}
                </AppText>
              </View>
              <AppText
                style={[styles.note, { color: colors.mutedForeground, textAlign }]}
              >
                {t("business.analytics.spendNote")}
              </AppText>
            </View>
          ) : null}
        </ScrollView>
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
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  ctaText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 16, paddingBottom: 120 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tile: {
    width: "48.5%",
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    gap: 6,
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  tileValue: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4 },
  tileLabel: { fontSize: 12.5, fontFamily: "Inter_400Regular", lineHeight: 17 },
  block: {
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    gap: 10,
  },
  blockHead: { alignItems: "center", gap: 8 },
  blockTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  chartRow: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 96,
    gap: 4,
    marginTop: 4,
  },
  chartCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  chartVal: { fontSize: 10, fontFamily: "Inter_500Medium" },
  bar: { width: "70%", borderRadius: 3, minWidth: 6 },
  spendRow: { alignItems: "center", gap: 8 },
  spendLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  spendValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  note: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: 2,
  },
});
