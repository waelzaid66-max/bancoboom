// Global supply / import-export request board (Task #40). Buyers post sourcing
// requests; suppliers respond with quotes. Real response counts; no fabricated
// figures. Tapping a request opens its detail with ranked supplier matches.
import { Feather, MaterialCommunityIcons } from "@/components/icons";
import {
  GlobalSupplyRequest,
  GlobalSupplyRequestStatus,
  useListGlobalSupply,
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

function statusTone(status: GlobalSupplyRequestStatus, colors: Colors) {
  switch (status) {
    case "open":
      return colors.primary;
    case "fulfilled":
      return colors.accent;
    default:
      return colors.mutedForeground;
  }
}

export default function GlobalSupplyScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign: "left" | "right" = isRTL ? "right" : "left";

  const { data, isLoading, isError, refetch, isRefetching } = useListGlobalSupply();
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
        testID="global-supply-back"
      >
        <Feather
          name={isRTL ? "arrow-right" : "arrow-left"}
          size={22}
          color={colors.foreground}
        />
      </Pressable>
      <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
        {t("business.globalSupply.title")}
      </AppText>
      <Pressable
        onPress={() => router.push("/business/global-supply/create")}
        style={styles.iconBtn}
        hitSlop={12}
        testID="global-supply-create"
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
            style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            testID="global-supply-retry"
          >
            <AppText style={[styles.retryText, { color: colors.primaryForeground }]}>
              {t("business.common.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.stateWrap}>
          <MaterialCommunityIcons name="earth" size={56} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("business.globalSupply.empty")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("business.globalSupply.emptyHint")}
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
            <RequestCard
              item={item}
              colors={colors}
              t={t}
              rowDir={rowDir}
              textAlign={textAlign}
              onPress={() => router.push(`/business/global-supply/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

function RequestCard({
  item,
  colors,
  t,
  rowDir,
  textAlign,
  onPress,
}: {
  item: GlobalSupplyRequest;
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
      style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}
      testID={`global-supply-item-${item.id}`}
    >
      <View style={[styles.cardTop, { flexDirection: rowDir }]}>
        <AppText
          style={[styles.cardTitle, { color: colors.foreground, textAlign }]}
          numberOfLines={2}
        >
          {item.product_text}
        </AppText>
        <View style={[styles.statusPill, { backgroundColor: tone + "22" }]}>
          <View style={[styles.statusDot, { backgroundColor: tone }]} />
          <AppText style={[styles.statusText, { color: tone }]}>
            {t(`business.globalSupply.status.${item.status}`)}
          </AppText>
        </View>
      </View>

      <View style={[styles.metaRow, { flexDirection: rowDir }]}>
        <Feather name="map-pin" size={13} color={colors.mutedForeground} />
        <AppText style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
          {item.destination_country}
        </AppText>
        {item.quantity ? (
          <>
            <AppText style={[styles.metaDot, { color: colors.mutedForeground }]}>•</AppText>
            <AppText style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.quantity}
              {item.unit ? ` ${item.unit}` : ""}
            </AppText>
          </>
        ) : null}
      </View>

      <View style={[styles.cardBottom, { flexDirection: rowDir, borderTopColor: colors.border }]}>
        {item.budget_max ? (
          <AppText style={[styles.budget, { color: colors.foreground }]}>
            {t("business.globalSupply.budgetMax")}: {item.budget_max} {item.currency}
          </AppText>
        ) : (
          <View />
        )}
        <View style={[styles.responseCount, { flexDirection: rowDir }]}>
          <Feather name="message-square" size={13} color={colors.primary} />
          <AppText style={[styles.responseText, { color: colors.primary }]}>
            {item.response_count} {t("business.globalSupply.responses")}
          </AppText>
        </View>
      </View>
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
  stateWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  stateTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center", marginTop: 6 },
  stateText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 14 },
  retryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 },
  card: { padding: 14, marginBottom: 12, gap: 8 },
  cardTop: { alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  cardTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  metaRow: { alignItems: "center", gap: 6, flexWrap: "wrap" },
  metaText: { fontSize: 12.5, fontFamily: "Inter_400Regular", flexShrink: 1 },
  metaDot: { fontSize: 12 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11.5, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  cardBottom: { alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 10, marginTop: 2, gap: 8 },
  budget: { flexShrink: 1, fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  responseCount: { alignItems: "center", gap: 5 },
  responseText: { fontSize: 12.5, fontFamily: "Inter_600SemiBold" },
});
