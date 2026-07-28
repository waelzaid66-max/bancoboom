// Global supply request detail (Task #40). Buyers see responses + ranked
// supplier matches; suppliers submit a quote via the inline respond form.
// match_reason is a human explanation, never a fabricated score. Marketplace
// disclaimer always shown.
import { Feather, MaterialCommunityIcons } from "@/components/icons";
import { useUser } from "@clerk/expo";
import {
  GlobalSupplyDetail,
  GlobalSupplyResponse,
  RespondGlobalSupplyBody,
  SupplierMatch,
  useGetGlobalSupply,
  useRespondGlobalSupply,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

import { MarketplaceDisclaimer } from "../supply-hub";

type Colors = ReturnType<typeof useColors>;
type T = (k: string, vars?: Record<string, string | number>) => string;

export default function GlobalSupplyDetailScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign: "left" | "right" = isRTL ? "right" : "left";
  const writeDir: "rtl" | "ltr" = isRTL ? "rtl" : "ltr";

  const { id } = useLocalSearchParams<{ id: string }>();
  const { isSignedIn, isLoaded } = useUser();
  const { data, isLoading, isError, refetch } = useGetGlobalSupply(id ?? "");
  const detail = data?.data as GlobalSupplyDetail | undefined;

  const { mutate: respond, isPending } = useRespondGlobalSupply();
  const [showForm, setShowForm] = useState(false);
  const [country, setCountry] = useState("");
  const [moq, setMoq] = useState("");
  const [shipDays, setShipDays] = useState("");
  const [priceQuote, setPriceQuote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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
        testID="global-supply-detail-back"
      >
        <Feather
          name={isRTL ? "arrow-right" : "arrow-left"}
          size={22}
          color={colors.foreground}
        />
      </Pressable>
      <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
        {t("business.globalSupply.detailTitle")}
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

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.secondary,
      color: colors.foreground,
      borderColor: colors.border,
      borderRadius: colors.radius,
      textAlign,
      writingDirection: writeDir,
    },
  ];

  const handleRespond = () => {
    if (isLoaded && !isSignedIn) {
      router.push("/(tabs)/profile");
      return;
    }
    setError(null);
    const body: RespondGlobalSupplyBody = {};
    if (country.trim()) body.country_of_origin = country.trim();
    const moqN = Number(moq);
    if (moq.trim() && !Number.isNaN(moqN)) body.moq = moqN;
    const shipN = Number(shipDays);
    if (shipDays.trim() && !Number.isNaN(shipN)) body.shipping_time_days = shipN;
    const priceN = Number(priceQuote);
    if (priceQuote.trim() && !Number.isNaN(priceN)) body.price_quote = priceN;
    if (message.trim()) body.message = message.trim();

    respond(
      { id: id ?? "", data: body },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSubmitted(true);
          setShowForm(false);
          refetch();
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(t("business.globalSupply.respondError"));
        },
      },
    );
  };

  const facts: { label: string; value: string }[] = [];
  if (detail.category)
    facts.push({ label: t("business.globalSupply.category"), value: t(`business.cat.${detail.category}`) });
  if (detail.industry)
    facts.push({ label: t("business.globalSupply.industry"), value: t(`business.ind.${detail.industry}`) });
  if (detail.quantity)
    facts.push({
      label: t("business.globalSupply.quantity"),
      value: `${detail.quantity}${detail.unit ? ` ${detail.unit}` : ""}`,
    });
  if (detail.budget_max)
    facts.push({
      label: t("business.globalSupply.budgetMax"),
      value: `${detail.budget_max} ${detail.currency}`,
    });
  if (detail.incoterms)
    facts.push({ label: t("business.globalSupply.incoterms"), value: detail.incoterms.toUpperCase() });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Header}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AppText style={[styles.title, { color: colors.foreground, textAlign }]}>
          {detail.product_text}
        </AppText>
        <View style={[styles.metaRow, { flexDirection: rowDir }]}>
          <Feather name="map-pin" size={13} color={colors.mutedForeground} />
          <AppText style={[styles.metaText, { color: colors.mutedForeground }]}>
            {detail.destination_country}
          </AppText>
        </View>

        <View
          style={[styles.factsCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}
        >
          {facts.map((f, i) => (
            <View
              key={f.label}
              style={[
                styles.factRow,
                { flexDirection: rowDir, borderTopColor: colors.border, borderTopWidth: i === 0 ? 0 : 1 },
              ]}
            >
              <AppText style={[styles.factLabel, { color: colors.mutedForeground }]}>{f.label}</AppText>
              <AppText
                style={[styles.factValue, { color: colors.foreground, textAlign: isRTL ? "left" : "right" }]}
              >
                {f.value}
              </AppText>
            </View>
          ))}
        </View>

        {detail.notes ? (
          <AppText style={[styles.notes, { color: colors.mutedForeground, textAlign }]}>
            {detail.notes}
          </AppText>
        ) : null}

        {/* Respond — suppliers only (the buyer cannot quote their own request) */}
        {detail.viewer_is_buyer ? null : submitted ? (
          <View
            style={[styles.notice, { backgroundColor: colors.primary + "1A", borderRadius: colors.radius }]}
          >
            <Feather name="check-circle" size={18} color={colors.primary} />
            <AppText style={[styles.noticeText, { color: colors.primary, textAlign }]}>
              {t("business.globalSupply.responseSent")}
            </AppText>
          </View>
        ) : showForm ? (
          <View style={[styles.formCard, { borderColor: colors.border, borderRadius: colors.radius }]}>
            <AppText style={[styles.formTitle, { color: colors.foreground, textAlign }]}>
              {t("business.globalSupply.respondTitle")}
            </AppText>

            <TextInput
              value={country}
              onChangeText={setCountry}
              placeholder={t("business.globalSupply.fCountry")}
              placeholderTextColor={colors.mutedForeground}
              style={inputStyle}
              testID="respond-country"
            />
            <View style={[styles.twoCol, { flexDirection: rowDir }]}>
              <TextInput
                value={moq}
                onChangeText={setMoq}
                placeholder={t("business.globalSupply.fMoq")}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={[...inputStyle, styles.flex1]}
                testID="respond-moq"
              />
              <TextInput
                value={shipDays}
                onChangeText={setShipDays}
                placeholder={t("business.globalSupply.fShipDays")}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={[...inputStyle, styles.flex1]}
                testID="respond-ship-days"
              />
            </View>
            <TextInput
              value={priceQuote}
              onChangeText={setPriceQuote}
              placeholder={t("business.globalSupply.fPriceQuote")}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              style={inputStyle}
              testID="respond-price"
            />
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={t("business.globalSupply.fMessage")}
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={[...inputStyle, styles.textArea]}
              testID="respond-message"
            />

            {error ? (
              <AppText style={[styles.errorText, { color: colors.destructive, textAlign }]}>
                {error}
              </AppText>
            ) : null}

            <Pressable
              onPress={handleRespond}
              disabled={isPending}
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: isPending ? 0.7 : 1 },
              ]}
              testID="respond-submit"
            >
              {isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <AppText style={[styles.submitText, { color: colors.primaryForeground }]}>
                  {t("business.globalSupply.submitResponse")}
                </AppText>
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowForm(true)}
            style={[
              styles.respondCta,
              { backgroundColor: colors.primary, borderRadius: colors.radius, flexDirection: rowDir },
            ]}
            testID="respond-open"
          >
            <Feather name="send" size={16} color={colors.primaryForeground} />
            <AppText style={[styles.submitText, { color: colors.primaryForeground }]}>
              {t("business.globalSupply.respond")}
            </AppText>
          </Pressable>
        )}

        {/* Supplier matches — shown to the buyer to discover suppliers */}
        {detail.viewer_is_buyer && detail.supplier_matches.length > 0 ? (
          <View style={[styles.section, { borderTopColor: colors.border }]}>
            <AppText style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>
              {t("business.globalSupply.matchesTitle")}
            </AppText>
            {detail.supplier_matches.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                colors={colors}
                t={t}
                rowDir={rowDir}
                textAlign={textAlign}
                onPress={() => router.push(`/business/company/${m.id}`)}
              />
            ))}
          </View>
        ) : null}

        {/* Responses — visible to the buyer who owns the request */}
        {detail.viewer_is_buyer ? (
          <View style={[styles.section, { borderTopColor: colors.border }]}>
            <AppText style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>
              {t("business.globalSupply.responsesTitle")}
            </AppText>
            {detail.responses.length === 0 ? (
              <AppText style={[styles.emptyResponses, { color: colors.mutedForeground, textAlign }]}>
                {t("business.globalSupply.noResponses")}
              </AppText>
            ) : (
              detail.responses.map((r) => (
                <ResponseRow key={r.id} response={r} colors={colors} t={t} rowDir={rowDir} textAlign={textAlign} />
              ))
            )}
          </View>
        ) : null}

        <View style={styles.disclaimerWrap}>
          <MarketplaceDisclaimer colors={colors} textAlign={textAlign} rowDir={rowDir} />
        </View>
      </ScrollView>
    </View>
  );
}

function MatchRow({
  match,
  colors,
  t,
  rowDir,
  textAlign,
  onPress,
}: {
  match: SupplierMatch;
  colors: Colors;
  t: T;
  rowDir: "row" | "row-reverse";
  textAlign: "left" | "right";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.matchRow, { backgroundColor: colors.card, borderRadius: colors.radius, flexDirection: rowDir }]}
      testID={`match-${match.id}`}
    >
      <View
        style={[styles.matchLogo, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}
      >
        <MaterialCommunityIcons name="office-building-outline" size={20} color={colors.mutedForeground} />
      </View>
      <View style={styles.matchInfo}>
        <View style={[styles.matchNameRow, { flexDirection: rowDir }]}>
          <AppText style={[styles.matchName, { color: colors.foreground, textAlign }]} numberOfLines={1}>
            {match.name}
          </AppText>
          {match.is_verified && (
            <MaterialCommunityIcons name="check-decagram" size={14} color={colors.primary} />
          )}
        </View>
        <AppText style={[styles.matchReason, { color: colors.mutedForeground, textAlign }]} numberOfLines={2}>
          {match.match_reason}
        </AppText>
      </View>
      <Feather name={rowDir === "row-reverse" ? "chevron-left" : "chevron-right"} size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

function ResponseRow({
  response,
  colors,
  t,
  rowDir,
  textAlign,
}: {
  response: GlobalSupplyResponse;
  colors: Colors;
  t: T;
  rowDir: "row" | "row-reverse";
  textAlign: "left" | "right";
}) {
  const bits: string[] = [];
  if (response.country_of_origin) bits.push(response.country_of_origin);
  if (response.moq) bits.push(`${t("business.globalSupply.moq")}: ${response.moq}`);
  if (response.shipping_time_days)
    bits.push(`${response.shipping_time_days} ${t("business.globalSupply.daysUnit")}`);
  if (response.incoterms) bits.push(response.incoterms.toUpperCase());

  return (
    <View style={[styles.responseRow, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
      <View style={[styles.responseHead, { flexDirection: rowDir }]}>
        <View style={[styles.matchNameRow, { flexDirection: rowDir }]}>
          <AppText style={[styles.matchName, { color: colors.foreground, textAlign }]} numberOfLines={1}>
            {response.supplier_name ?? t("business.globalSupply.supplierFallback")}
          </AppText>
          {response.supplier_is_verified && (
            <MaterialCommunityIcons name="check-decagram" size={14} color={colors.primary} />
          )}
        </View>
        {response.price_quote ? (
          <AppText style={[styles.responsePrice, { color: colors.primary }]}>
            {response.price_quote} {response.currency}
          </AppText>
        ) : null}
      </View>
      {bits.length > 0 ? (
        <AppText style={[styles.responseMeta, { color: colors.mutedForeground, textAlign }]}>
          {bits.join("  •  ")}
        </AppText>
      ) : null}
      {response.message ? (
        <AppText style={[styles.responseMsg, { color: colors.mutedForeground, textAlign }]}>
          {response.message}
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
  title: { fontSize: 19, fontFamily: "Inter_700Bold", lineHeight: 26 },
  metaRow: { alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 8 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular", flexShrink: 1 },
  factsCard: { padding: 14, marginTop: 16 },
  factRow: { justifyContent: "space-between", alignItems: "center", paddingVertical: 10, gap: 12 },
  factLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  factValue: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  notes: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginTop: 14 },
  notice: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, marginTop: 16 },
  noticeText: { flex: 1, fontSize: 13.5, fontFamily: "Inter_500Medium", lineHeight: 20 },
  respondCta: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, marginTop: 16 },
  formCard: { borderWidth: 1, padding: 14, marginTop: 16, gap: 10 },
  formTitle: { fontSize: 15.5, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { minHeight: 80, paddingTop: 12, textAlignVertical: "top" },
  twoCol: { gap: 10 },
  flex1: { flex: 1 },
  errorText: { fontSize: 13.5, fontFamily: "Inter_500Medium" },
  submitBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 14, marginTop: 4 },
  submitText: { fontSize: 15.5, fontFamily: "Inter_600SemiBold" },
  section: { borderTopWidth: 1, paddingTop: 16, marginTop: 20 },
  sectionTitle: { fontSize: 15.5, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  matchRow: { alignItems: "center", gap: 12, padding: 12, marginBottom: 10 },
  matchLogo: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  matchInfo: { flex: 1, gap: 3 },
  matchNameRow: { alignItems: "center", gap: 6 },
  matchName: { flexShrink: 1, fontSize: 14.5, fontFamily: "Inter_600SemiBold" },
  matchReason: { fontSize: 12.5, fontFamily: "Inter_400Regular", lineHeight: 18 },
  responseRow: { padding: 12, marginBottom: 10, gap: 6 },
  responseHead: { alignItems: "center", justifyContent: "space-between", gap: 10 },
  responsePrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
  responseMeta: { fontSize: 12.5, fontFamily: "Inter_500Medium" },
  responseMsg: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  emptyResponses: { fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 20 },
  disclaimerWrap: { marginTop: 24 },
});
