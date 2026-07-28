// "My Requests" — RFQs the signed-in buyer created, with status + offer count.
// Tap a request → ranked offers detail. Structured, non-chat procurement.
import { Feather, MaterialCommunityIcons } from "@/components/icons";
import { useUser } from "@clerk/expo";
import { Rfq, RfqStatus, useListMyRfqs } from "@workspace/api-client-react";
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

function statusTone(status: RfqStatus, colors: Colors) {
  switch (status) {
    case "open":
      return colors.primary;
    case "awarded":
      return colors.accent;
    case "cancelled":
      return colors.destructive;
    default:
      return colors.mutedForeground;
  }
}

export default function MyRequestsScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";

  const { isSignedIn, isLoaded } = useUser();
  const { data, isLoading, isError, refetch, isRefetching } = useListMyRfqs();
  const rfqs = data?.data ?? [];

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
        testID="rfq-back"
      >
        <Feather
          name={isRTL ? "arrow-right" : "arrow-left"}
          size={22}
          color={colors.foreground}
        />
      </Pressable>
      <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
        {t("rfq.title")}
      </AppText>
      <Pressable
        onPress={() => router.push("/rfq/create")}
        style={styles.iconBtn}
        hitSlop={12}
        testID="rfq-create"
      >
        <Feather name="plus" size={24} color={colors.primary} />
      </Pressable>
    </View>
  );

  if (isLoaded && !isSignedIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Header}
        <View style={styles.stateWrap}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={56}
            color={colors.mutedForeground}
          />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("rfq.signInRequired")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("rfq.signInHint")}
          </AppText>
          <Pressable
            onPress={() => router.replace("/(tabs)/profile")}
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="rfq-go-profile"
          >
            <AppText
              style={[styles.primaryText, { color: colors.primaryForeground }]}
            >
              {t("rfq.goToProfile")}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

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
            {t("rfq.loadError")}
          </AppText>
          <Pressable
            onPress={() => refetch()}
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="rfq-retry"
          >
            <Feather
              name="refresh-cw"
              size={16}
              color={colors.primaryForeground}
            />
            <AppText
              style={[styles.primaryText, { color: colors.primaryForeground }]}
            >
              {t("rfq.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : rfqs.length === 0 ? (
        <View style={styles.stateWrap}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={56}
            color={colors.mutedForeground}
          />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("rfq.empty")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("rfq.emptyHint")}
          </AppText>
          <Pressable
            onPress={() => router.push("/rfq/create")}
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="rfq-empty-create"
          >
            <Feather name="plus" size={16} color={colors.primaryForeground} />
            <AppText
              style={[styles.primaryText, { color: colors.primaryForeground }]}
            >
              {t("rfq.newRequest")}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rfqs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <RfqCard
              item={item}
              colors={colors}
              t={t}
              rowDir={rowDir}
              textAlign={textAlign}
              onPress={() => router.push(`/rfq/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

function RfqCard({
  item,
  colors,
  t,
  rowDir,
  textAlign,
  onPress,
}: {
  item: Rfq;
  colors: Colors;
  t: (k: string) => string;
  rowDir: "row" | "row-reverse";
  textAlign: "left" | "right";
  onPress: () => void;
}) {
  const tone = statusTone(item.status, colors);
  const meta = [
    t(`rfq.cat.${item.category}`),
    item.industrial_type ? t(`rfq.it.${item.industrial_type}`) : null,
  ]
    .filter(Boolean)
    .join("  •  ");

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderRadius: colors.radius },
      ]}
      testID={`rfq-item-${item.id}`}
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
            {t(`rfq.status.${item.status}`)}
          </AppText>
        </View>
      </View>

      {!!meta && (
        <AppText
          style={[styles.cardMeta, { color: colors.mutedForeground, textAlign }]}
          numberOfLines={1}
        >
          {meta}
        </AppText>
      )}

      {item.target_price_max ? (
        <AppText
          style={[styles.cardPrice, { color: colors.foreground, textAlign }]}
        >
          {t("rfq.target")}: {item.target_price_max}
        </AppText>
      ) : null}

      <View
        style={[
          styles.cardBottom,
          { flexDirection: rowDir, borderTopColor: colors.border },
        ]}
      >
        <View style={[styles.offerCount, { flexDirection: rowDir }]}>
          <MaterialCommunityIcons
            name="tag-multiple-outline"
            size={15}
            color={colors.primary}
          />
          <AppText style={[styles.offerCountText, { color: colors.primary }]}>
            {item.offer_count} {t("rfq.offersWord")}
          </AppText>
        </View>
        {item.deadline ? (
          <AppText
            style={[styles.deadline, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {t("rfq.deadline")}: {item.deadline}
          </AppText>
        ) : null}
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
  cardMeta: { fontSize: 12.5, fontFamily: "Inter_400Regular", textTransform: "capitalize" },
  cardPrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
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
  },
  offerCount: { alignItems: "center", gap: 5 },
  offerCountText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  deadline: { fontSize: 12, fontFamily: "Inter_400Regular", flexShrink: 1 },
});
