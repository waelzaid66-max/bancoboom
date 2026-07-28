// RFQ detail — request summary + ranked supplier offer cards. Buyer sees all
// offers (visibility enforced server-side). Every monetary value is a
// pre-formatted BFF string; the client never computes or ranks money.
import { Feather, MaterialCommunityIcons } from "@/components/icons";
import {
  RfqDetail,
  RfqOffer,
  RfqOfferStatus,
  useGetRfq,
} from "@workspace/api-client-react";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
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

function offerTone(status: RfqOfferStatus, colors: Colors) {
  switch (status) {
    case "accepted":
      return colors.primary;
    case "rejected":
    case "withdrawn":
      return colors.destructive;
    default:
      return colors.mutedForeground;
  }
}

export default function RfqDetailScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";

  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useGetRfq(id ?? "");
  const rfq = data?.data;

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
        testID="rfq-detail-back"
      >
        <Feather
          name={isRTL ? "arrow-right" : "arrow-left"}
          size={22}
          color={colors.foreground}
        />
      </Pressable>
      <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
        {t("rfq.detailTitle")}
      </AppText>
      <View style={styles.iconBtn} />
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Header}
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (isError || !rfq) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Header}
        <View style={styles.stateWrap}>
          <Feather name="alert-circle" size={48} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("rfq.loadError")}
          </AppText>
        </View>
      </View>
    );
  }

  const detail: RfqDetail = rfq;
  const infoRows: { label: string; value: string | null }[] = [
    { label: t("rfq.qty"), value: rfqQty(detail) },
    { label: t("rfq.target"), value: detail.target_price_max },
    { label: t("rfq.destination"), value: detail.destination_country },
    {
      label: t("rfq.industryLabel"),
      value: detail.industry ? t(`rfq.ind.${detail.industry}`) : null,
    },
    {
      label: t("rfq.typeLabel"),
      value: detail.industrial_type
        ? t(`rfq.it.${detail.industrial_type}`)
        : null,
    },
    { label: t("rfq.deadline"), value: detail.deadline },
  ].filter((r) => !!r.value);

  const tone =
    detail.status === "open"
      ? colors.primary
      : detail.status === "cancelled"
        ? colors.destructive
        : detail.status === "awarded"
          ? colors.accent
          : colors.mutedForeground;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Header}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.titleRow, { flexDirection: rowDir }]}>
          <AppText
            style={[styles.title, { color: colors.foreground, textAlign }]}
          >
            {detail.title}
          </AppText>
          <View style={[styles.statusPill, { backgroundColor: tone + "22" }]}>
            <View style={[styles.statusDot, { backgroundColor: tone }]} />
            <AppText style={[styles.statusText, { color: tone }]}>
              {t(`rfq.status.${detail.status}`)}
            </AppText>
          </View>
        </View>

        {detail.description ? (
          <AppText
            style={[
              styles.description,
              { color: colors.mutedForeground, textAlign },
            ]}
          >
            {detail.description}
          </AppText>
        ) : null}

        {infoRows.length > 0 && (
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.card, borderRadius: colors.radius },
            ]}
          >
            {infoRows.map((r, i) => (
              <View
                key={r.label}
                style={[
                  styles.infoRow,
                  {
                    flexDirection: rowDir,
                    borderTopColor: colors.border,
                    borderTopWidth: i === 0 ? 0 : 1,
                  },
                ]}
              >
                <AppText
                  style={[styles.infoLabel, { color: colors.mutedForeground }]}
                >
                  {r.label}
                </AppText>
                <AppText
                  style={[
                    styles.infoValue,
                    { color: colors.foreground, textAlign: isRTL ? "left" : "right" },
                  ]}
                >
                  {r.value}
                </AppText>
              </View>
            ))}
          </View>
        )}

        <AppText
          style={[styles.offersHeader, { color: colors.foreground, textAlign }]}
        >
          {t("rfq.offersTitle")} ({detail.offer_count})
        </AppText>

        {!detail.viewer_is_buyer ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: colors.card, borderRadius: colors.radius },
            ]}
          >
            <MaterialCommunityIcons
              name="lock-outline"
              size={20}
              color={colors.mutedForeground}
            />
            <AppText
              style={[styles.noticeText, { color: colors.mutedForeground, textAlign }]}
            >
              {t("rfq.offersPrivate")}
            </AppText>
          </View>
        ) : detail.offers.length === 0 ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: colors.card, borderRadius: colors.radius },
            ]}
          >
            <MaterialCommunityIcons
              name="timer-sand"
              size={20}
              color={colors.mutedForeground}
            />
            <AppText
              style={[styles.noticeText, { color: colors.mutedForeground, textAlign }]}
            >
              {t("rfq.noOffers")}
            </AppText>
          </View>
        ) : (
          detail.offers.map((offer, idx) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              rank={idx + 1}
              colors={colors}
              t={t}
              rowDir={rowDir}
              textAlign={textAlign}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function rfqQty(d: RfqDetail): string | null {
  if (!d.quantity) return null;
  return d.unit ? `${d.quantity} ${d.unit}` : d.quantity;
}

function OfferCard({
  offer,
  rank,
  colors,
  t,
  rowDir,
  textAlign,
}: {
  offer: RfqOffer;
  rank: number;
  colors: Colors;
  t: (k: string) => string;
  rowDir: "row" | "row-reverse";
  textAlign: "left" | "right";
}) {
  const tone = offerTone(offer.status, colors);
  const isTop = rank === 1;

  return (
    <View
      style={[
        styles.offerCard,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: isTop ? colors.primary : colors.border,
          borderWidth: isTop ? 1.5 : 1,
        },
      ]}
      testID={`rfq-offer-${offer.id}`}
    >
      <View style={[styles.offerTop, { flexDirection: rowDir }]}>
        <View style={[styles.supplierRow, { flexDirection: rowDir }]}>
          {offer.supplier_is_verified && (
            <MaterialCommunityIcons
              name="check-decagram"
              size={15}
              color={colors.primary}
            />
          )}
          <AppText
            style={[styles.supplierName, { color: colors.foreground, textAlign }]}
            numberOfLines={1}
          >
            {offer.supplier_name ?? t("rfq.supplierFallback")}
          </AppText>
          {offer.is_mine && (
            <View style={[styles.minePill, { backgroundColor: colors.primary + "1A" }]}>
              <AppText style={[styles.minePillText, { color: colors.primary }]}>
                {t("rfq.mine")}
              </AppText>
            </View>
          )}
        </View>
        {isTop && (
          <View style={[styles.topPill, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons
              name="trophy-variant"
              size={11}
              color={colors.primaryForeground}
            />
            <AppText style={[styles.topPillText, { color: colors.primaryForeground }]}>
              {t("rfq.topQuote")}
            </AppText>
          </View>
        )}
      </View>

      <View style={[styles.priceRow, { flexDirection: rowDir }]}>
        <AppText style={[styles.priceQuote, { color: colors.foreground }]}>
          {offer.price_quote}
        </AppText>
        <AppText style={[styles.currency, { color: colors.mutedForeground }]}>
          {offer.currency}
        </AppText>
      </View>

      <View style={[styles.offerMetaRow, { flexDirection: rowDir }]}>
        {offer.lead_time_days != null && (
          <View style={[styles.metaChip, { flexDirection: rowDir }]}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <AppText style={[styles.metaChipText, { color: colors.mutedForeground }]}>
              {offer.lead_time_days} {t("rfq.daysUnit")}
            </AppText>
          </View>
        )}
        {offer.moq ? (
          <View style={[styles.metaChip, { flexDirection: rowDir }]}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={13}
              color={colors.mutedForeground}
            />
            <AppText style={[styles.metaChipText, { color: colors.mutedForeground }]}>
              {t("rfq.moq")}: {offer.moq}
            </AppText>
          </View>
        ) : null}
        <View style={[styles.offerStatusPill, { backgroundColor: tone + "22" }]}>
          <AppText style={[styles.offerStatusText, { color: tone }]}>
            {t(`rfq.offerStatus.${offer.status}`)}
          </AppText>
        </View>
      </View>

      {offer.message ? (
        <AppText
          style={[styles.offerMessage, { color: colors.foreground, textAlign }]}
        >
          {offer.message}
        </AppText>
      ) : null}
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
  stateWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  stateTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  scroll: { padding: 16, paddingBottom: 120 },
  titleRow: { alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 27 },
  description: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginTop: 10 },
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
  infoCard: { padding: 14, marginTop: 16 },
  infoRow: { justifyContent: "space-between", alignItems: "center", paddingVertical: 9, gap: 12 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: { flex: 1, fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  offersHeader: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 24, marginBottom: 12 },
  notice: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16 },
  noticeText: { flex: 1, fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 20 },
  offerCard: { padding: 14, marginBottom: 12, gap: 8 },
  offerTop: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  supplierRow: { flex: 1, alignItems: "center", gap: 6 },
  supplierName: { fontSize: 14.5, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  minePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  minePillText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  topPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  topPillText: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  priceRow: { alignItems: "baseline", gap: 6 },
  priceQuote: { fontSize: 22, fontFamily: "Inter_700Bold" },
  currency: { fontSize: 13, fontFamily: "Inter_500Medium" },
  offerMetaRow: { alignItems: "center", flexWrap: "wrap", gap: 8 },
  metaChip: { alignItems: "center", gap: 4 },
  metaChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  offerStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  offerStatusText: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  offerMessage: { fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 20, marginTop: 2 },
});
