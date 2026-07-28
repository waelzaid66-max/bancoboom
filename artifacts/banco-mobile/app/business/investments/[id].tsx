// Investment opportunity detail (Task #40). Standalone entity, NOT a listing.
// Every figure is seller-provided/estimate and nullable — hidden when null,
// never fabricated. A figures disclaimer + marketplace disclaimer always show.
import { Feather, MaterialCommunityIcons } from "@/components/icons";
import { useUser } from "@clerk/expo";
import {
  InvestmentDetail,
  useGetInvestment,
  useSubmitInvestmentInterest,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
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

import { MarketplaceDisclaimer } from "../supply-hub";

type Colors = ReturnType<typeof useColors>;

export default function InvestmentDetailScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign: "left" | "right" = isRTL ? "right" : "left";

  const { id } = useLocalSearchParams<{ id: string }>();
  const { isSignedIn, isLoaded } = useUser();
  const { data, isLoading, isError, refetch } = useGetInvestment(id ?? "");
  const detail = data?.data as InvestmentDetail | undefined;

  const { mutate: submitInterest, isPending } = useSubmitInvestmentInterest();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        testID="investment-detail-back"
      >
        <Feather
          name={isRTL ? "arrow-right" : "arrow-left"}
          size={22}
          color={colors.foreground}
        />
      </Pressable>
      <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
        {t("business.investments.detailTitle")}
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

  if (isError || !detail) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Header}
        <View style={styles.stateWrap}>
          <Feather name="alert-circle" size={48} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("business.common.loadError")}
          </AppText>
        </View>
      </View>
    );
  }

  const tone =
    detail.status === "active"
      ? colors.primary
      : detail.status === "under_offer"
        ? colors.accent
        : detail.status === "closed"
          ? colors.destructive
          : colors.mutedForeground;

  const figures: { label: string; value: string }[] = [
    {
      label: t("business.investments.totalValue"),
      value: `${detail.total_value_display} ${detail.currency}`,
    },
  ];
  if (detail.expected_roi_pct) {
    figures.push({
      label: t("business.investments.roi"),
      value: `${detail.expected_roi_pct}%`,
    });
  }
  if (detail.payback_years) {
    figures.push({
      label: t("business.investments.payback"),
      value: `${detail.payback_years} ${t("business.investments.yearsUnit")}`,
    });
  }
  if (detail.revenue_range_min || detail.revenue_range_max) {
    const min = detail.revenue_range_min ?? "";
    const max = detail.revenue_range_max ?? "";
    const range = min && max ? `${min} – ${max}` : min || max;
    figures.push({
      label: t("business.investments.revenue"),
      value: `${range} ${detail.currency}`,
    });
  }

  const figuresDisclaimer =
    detail.figures_source === "estimate"
      ? t("business.disclaimer.estimateFigures")
      : t("business.disclaimer.sellerFigures");

  const handleInterest = () => {
    if (isLoaded && !isSignedIn) {
      router.push("/(tabs)/profile");
      return;
    }
    setError(null);
    submitInterest(
      { id: id ?? "", data: {} },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSent(true);
          refetch();
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(t("business.investments.interestError"));
        },
      },
    );
  };

  const hasInterest = detail.viewer_has_interest || sent;

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
              {t(`business.investments.status.${detail.status}`)}
            </AppText>
          </View>
        </View>

        <AppText style={[styles.typeText, { color: colors.primary, textAlign }]}>
          {t(`business.investments.type.${detail.investment_type}`)}
        </AppText>

        <View style={[styles.metaRow, { flexDirection: rowDir }]}>
          {/* Factory / production-line locations are real places — tap opens the
              maps app (same text-search fallback the listing detail uses). Only
              rendered tappable when a location actually exists (honest gating). */}
          <Pressable
            onPress={() => {
              const place = (detail.location ?? "").trim();
              if (!place) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const q = encodeURIComponent(place);
              const webUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;
              const nativeUrl = Platform.select({
                ios: `maps://?q=${q}`,
                android: `geo:0,0?q=${q}`,
                default: webUrl,
              });
              Linking.openURL(nativeUrl ?? webUrl).catch(() =>
                Linking.openURL(webUrl).catch(() => {}),
              );
            }}
            disabled={!detail.location}
            style={[styles.metaRow, { flexDirection: rowDir }]}
            testID="investment-open-maps"
          >
            <Feather
              name="map-pin"
              size={13}
              color={detail.location ? colors.accent : colors.mutedForeground}
            />
            <AppText
              style={[
                styles.metaText,
                { color: detail.location ? colors.accent : colors.mutedForeground },
              ]}
            >
              {detail.location}
            </AppText>
          </Pressable>
          {detail.industry ? (
            <>
              <AppText style={[styles.metaDot, { color: colors.mutedForeground }]}>
                •
              </AppText>
              <AppText style={[styles.metaText, { color: colors.mutedForeground }]}>
                {t(`business.ind.${detail.industry}`)}
              </AppText>
            </>
          ) : null}
        </View>

        <View style={[styles.ownerRow, { flexDirection: rowDir }]}>
          {detail.owner_is_verified && (
            <MaterialCommunityIcons
              name="check-decagram"
              size={15}
              color={colors.primary}
            />
          )}
          <AppText style={[styles.ownerText, { color: colors.foreground }]}>
            {detail.owner_name ?? t("business.investments.ownerFallback")}
          </AppText>
        </View>

        <View
          style={[
            styles.figuresCard,
            { backgroundColor: colors.card, borderRadius: colors.radius },
          ]}
        >
          {figures.map((f, i) => (
            <View
              key={f.label}
              style={[
                styles.figureRow,
                {
                  flexDirection: rowDir,
                  borderTopColor: colors.border,
                  borderTopWidth: i === 0 ? 0 : 1,
                },
              ]}
            >
              <AppText
                style={[styles.figureLabel, { color: colors.mutedForeground }]}
              >
                {f.label}
              </AppText>
              <AppText
                style={[
                  styles.figureValue,
                  { color: colors.foreground, textAlign: isRTL ? "left" : "right" },
                ]}
              >
                {f.value}
              </AppText>
            </View>
          ))}
        </View>

        <View style={[styles.figuresNote, { flexDirection: rowDir }]}>
          <Feather name="info" size={13} color={colors.mutedForeground} />
          <AppText
            style={[styles.figuresNoteText, { color: colors.mutedForeground, textAlign }]}
          >
            {figuresDisclaimer}
          </AppText>
        </View>

        {detail.description ? (
          <AppText
            style={[styles.description, { color: colors.mutedForeground, textAlign }]}
          >
            {detail.description}
          </AppText>
        ) : null}

        {detail.cost_structure_note ? (
          <NoteBlock
            title={t("business.investments.costNote")}
            body={detail.cost_structure_note}
            colors={colors}
            textAlign={textAlign}
          />
        ) : null}
        {detail.growth_potential_note ? (
          <NoteBlock
            title={t("business.investments.growthNote")}
            body={detail.growth_potential_note}
            colors={colors}
            textAlign={textAlign}
          />
        ) : null}

        <AppText
          style={[styles.interestCount, { color: colors.mutedForeground, textAlign }]}
        >
          {detail.interest_count} {t("business.investments.interestCount")}
        </AppText>

        {detail.viewer_is_owner ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: colors.card, borderRadius: colors.radius },
            ]}
          >
            <AppText
              style={[styles.noticeText, { color: colors.mutedForeground, textAlign }]}
            >
              {t("business.investments.ownerView")}
            </AppText>
          </View>
        ) : hasInterest ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: colors.primary + "1A", borderRadius: colors.radius },
            ]}
          >
            <Feather name="check-circle" size={18} color={colors.primary} />
            <AppText style={[styles.noticeText, { color: colors.primary, textAlign }]}>
              {sent
                ? t("business.investments.interestSent")
                : t("business.investments.alreadyInterested")}
            </AppText>
          </View>
        ) : (
          <Pressable
            onPress={handleInterest}
            disabled={isPending}
            style={[
              styles.submitBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
                opacity: isPending ? 0.7 : 1,
              },
            ]}
            testID="investment-express-interest"
          >
            {isPending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <AppText style={[styles.submitText, { color: colors.primaryForeground }]}>
                {t("business.investments.expressInterest")}
              </AppText>
            )}
          </Pressable>
        )}

        {error ? (
          <AppText style={[styles.errorText, { color: colors.destructive, textAlign }]}>
            {error}
          </AppText>
        ) : null}

        <View style={styles.disclaimerWrap}>
          <MarketplaceDisclaimer colors={colors} textAlign={textAlign} rowDir={rowDir} />
        </View>
      </ScrollView>
    </View>
  );
}

function NoteBlock({
  title,
  body,
  colors,
  textAlign,
}: {
  title: string;
  body: string;
  colors: Colors;
  textAlign: "left" | "right";
}) {
  return (
    <View style={styles.noteBlock}>
      <AppText style={[styles.noteTitle, { color: colors.foreground, textAlign }]}>
        {title}
      </AppText>
      <AppText style={[styles.noteBody, { color: colors.mutedForeground, textAlign }]}>
        {body}
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  stateWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  stateTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  scroll: { padding: 16, paddingBottom: 120 },
  titleRow: { alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 27 },
  typeText: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  metaRow: { alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 8 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular", flexShrink: 1 },
  metaDot: { fontSize: 12 },
  ownerRow: { alignItems: "center", gap: 6, marginTop: 10 },
  ownerText: { fontSize: 13.5, fontFamily: "Inter_500Medium" },
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
  figuresCard: { padding: 14, marginTop: 16 },
  figureRow: { justifyContent: "space-between", alignItems: "center", paddingVertical: 10, gap: 12 },
  figureLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  figureValue: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold" },
  figuresNote: { alignItems: "flex-start", gap: 7, marginTop: 10 },
  figuresNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  description: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginTop: 16 },
  noteBlock: { marginTop: 16, gap: 5 },
  noteTitle: { fontSize: 14.5, fontFamily: "Inter_600SemiBold" },
  noteBody: { fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 20 },
  interestCount: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 20 },
  notice: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, marginTop: 10 },
  noticeText: { flex: 1, fontSize: 13.5, fontFamily: "Inter_500Medium", lineHeight: 20 },
  submitBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 15, marginTop: 16 },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  errorText: { fontSize: 13.5, fontFamily: "Inter_500Medium", marginTop: 12 },
  disclaimerWrap: { marginTop: 24 },
});
