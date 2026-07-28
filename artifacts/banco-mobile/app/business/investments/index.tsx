// Investment opportunities browse list (Task #40). Standalone entities, NOT
// listings. All financial figures are seller-provided/estimates and nullable —
// hidden when null, never fabricated. figures_source drives the honesty chip.
import { Feather, MaterialCommunityIcons } from "@/components/icons";
import {
  InvestmentSummary,
  InvestmentSummaryStatus,
  useListInvestments,
} from "@workspace/api-client-react";
import { router } from "expo-router";
import React from "react";
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

type Colors = ReturnType<typeof useColors>;
type T = (k: string, vars?: Record<string, string | number>) => string;

function statusTone(status: InvestmentSummaryStatus, colors: Colors) {
  switch (status) {
    case "active":
      return colors.primary;
    case "under_offer":
      return colors.accent;
    case "closed":
      return colors.destructive;
    default:
      return colors.mutedForeground;
  }
}

export default function InvestmentsScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign: "left" | "right" = isRTL ? "right" : "left";

  const { data, isLoading, isError, refetch, isRefetching } =
    useListInvestments();
  const items = data?.data ?? [];

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
        testID="investments-back"
      >
        <Feather
          name={isRTL ? "arrow-right" : "arrow-left"}
          size={22}
          color={colors.foreground}
        />
      </Pressable>
      <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
        {t("business.investments.browseTitle")}
      </AppText>
      <Pressable
        onPress={() => router.push("/business/investments/create")}
        style={styles.iconBtn}
        hitSlop={12}
        testID="investments-create"
      >
        <Feather name="plus" size={24} color={colors.primary} />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Header}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.stateWrap}>
          <Feather name="wifi-off" size={52} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("business.common.loadError")}
          </AppText>
          <Pressable
            onPress={() => refetch()}
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="investments-retry"
          >
            <Feather
              name="refresh-cw"
              size={16}
              color={colors.primaryForeground}
            />
            <AppText
              style={[styles.primaryText, { color: colors.primaryForeground }]}
            >
              {t("business.common.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.stateWrap}>
          <MaterialCommunityIcons
            name="chart-box-outline"
            size={56}
            color={colors.mutedForeground}
          />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("business.investments.empty")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("business.investments.emptyHint")}
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
            <InvestmentCard
              item={item}
              colors={colors}
              t={t}
              rowDir={rowDir}
              textAlign={textAlign}
              onPress={() => router.push(`/business/investments/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

function InvestmentCard({
  item,
  colors,
  t,
  rowDir,
  textAlign,
  onPress,
}: {
  item: InvestmentSummary;
  colors: Colors;
  t: T;
  rowDir: "row" | "row-reverse";
  textAlign: "left" | "right";
  onPress: () => void;
}) {
  const tone = statusTone(item.status, colors);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderRadius: colors.radius },
      ]}
      testID={`investment-item-${item.id}`}
    >
      <View style={[styles.cardTop, { flexDirection: rowDir }]}>
        <AppText
          style={[styles.cardTitle, { color: colors.foreground, textAlign }]}
          numberOfLines={2}
        >
          {item.title}
        </AppText>
        <View style={[styles.statusPill, { backgroundColor: tone + "22" }]}>
          <View style={[styles.statusDot, { backgroundColor: tone }]} />
          <AppText style={[styles.statusText, { color: tone }]}>
            {t(`business.investments.status.${item.status}`)}
          </AppText>
        </View>
      </View>

      <AppText
        style={[styles.cardType, { color: colors.primary, textAlign }]}
        numberOfLines={1}
      >
        {t(`business.investments.type.${item.investment_type}`)}
      </AppText>

      <View style={[styles.metaRow, { flexDirection: rowDir }]}>
        <Feather name="map-pin" size={13} color={colors.mutedForeground} />
        <AppText
          style={[styles.metaText, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {item.location}
        </AppText>
        {item.industry ? (
          <>
            <AppText style={[styles.metaDot, { color: colors.mutedForeground }]}>
              •
            </AppText>
            <AppText
              style={[styles.metaText, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {t(`business.ind.${item.industry}`)}
            </AppText>
          </>
        ) : null}
      </View>

      <View
        style={[
          styles.cardBottom,
          { flexDirection: rowDir, borderTopColor: colors.border },
        ]}
      >
        <View style={[styles.priceWrap, { flexDirection: rowDir }]}>
          <AppText style={[styles.price, { color: colors.foreground }]}>
            {item.total_value_display}
          </AppText>
          <AppText style={[styles.currency, { color: colors.mutedForeground }]}>
            {item.currency}
          </AppText>
        </View>
        {item.expected_roi_pct ? (
          <AppText style={[styles.roi, { color: colors.primary }]}>
            {t("business.investments.roi")}: {item.expected_roi_pct}%
          </AppText>
        ) : null}
      </View>

      <AppText
        style={[styles.figuresChip, { color: colors.mutedForeground, textAlign }]}
        numberOfLines={1}
      >
        {item.figures_source === "estimate"
          ? t("business.investments.figuresChipEstimate")
          : t("business.investments.figuresChipSeller")}
      </AppText>
    </Pressable>
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
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  primaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 },
  card: { padding: 14, marginBottom: 12, gap: 6 },
  cardTop: { alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  cardTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  cardType: { fontSize: 12.5, fontFamily: "Inter_600SemiBold" },
  metaRow: { alignItems: "center", gap: 6, flexWrap: "wrap" },
  metaText: { fontSize: 12.5, fontFamily: "Inter_400Regular", flexShrink: 1 },
  metaDot: { fontSize: 12 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11.5, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  cardBottom: {
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
    gap: 8,
  },
  priceWrap: { alignItems: "baseline", gap: 6 },
  price: { fontSize: 16, fontFamily: "Inter_700Bold" },
  currency: { fontSize: 12, fontFamily: "Inter_500Medium" },
  roi: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  figuresChip: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 8 },
});
