// Seller RFQ inbox — browse open buyer requests and send a quote (offer).
// Imperative API fns (listRfqs / getRfq / submitRfqOffer), mirroring
// requests.tsx & wallet.tsx. Honesty rules:
//  - the offer form is hidden unless the request is genuinely quotable: status
//    must be "open", the viewer must not be the buyer, and the viewer must not
//    already have an offer on it. Otherwise we show an honest explanatory note.
//  - 401/403 on browse → "become a business" CTA, never a fake empty inbox.
import { Feather, MaterialCommunityIcons } from "@/components/icons";
import {
  listRfqs,
  getRfq,
  submitRfqOffer,
  type Rfq,
  type RfqDetail,
  type RfqOffer,
  type RfqOfferStatus,
  type SubmitRfqOfferBody,
} from "@workspace/api-client-react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

type LoadState = "loading" | "ready" | "error" | "restricted";
type DetailState = "loading" | "ready" | "error";
type Colors = ReturnType<typeof useColors>;
type T = ReturnType<typeof useI18n>["t"];

const PAGE = 20;

function formatDate(iso: string | null | undefined, isRTL: boolean): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(isRTL ? "ar-EG" : undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function offerStatusTone(status: RfqOfferStatus, colors: Colors): string {
  switch (status) {
    case "accepted":
      return "#16A34A";
    case "rejected":
      return "#DC2626";
    case "pending":
      return colors.accent;
    default:
      return colors.mutedForeground;
  }
}

const numOrUndef = (s: string): number | undefined => {
  const cleaned = s.replace(/[^\d.]/g, "");
  if (!cleaned) return undefined;
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : undefined;
};

const intOrUndef = (s: string): number | undefined => {
  const cleaned = s.replace(/[^\d]/g, "");
  if (!cleaned) return undefined;
  const n = parseInt(cleaned, 10);
  return isFinite(n) ? n : undefined;
};

function MetaRow({
  icon,
  label,
  value,
  colors,
  rowDir,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  colors: Colors;
  rowDir: "row" | "row-reverse";
}) {
  return (
    <View style={[styles.metaRow, { flexDirection: rowDir }]}>
      <Feather name={icon} size={14} color={colors.mutedForeground} />
      <AppText style={[styles.metaLabel, { color: colors.mutedForeground }]}>
        {label}
      </AppText>
      <AppText
        style={[styles.metaValue, { color: colors.foreground }]}
        numberOfLines={1}
      >
        {value}
      </AppText>
    </View>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  keyboardType,
  colors,
  textAlign,
  inputAlign,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
  colors: Colors;
  textAlign: "left" | "right";
  inputAlign: "left" | "right";
  testID?: string;
}) {
  return (
    <View style={styles.field}>
      <AppText style={[styles.label, { color: colors.foreground, textAlign }]}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            color: colors.foreground,
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
            textAlign: inputAlign,
          },
        ]}
        testID={testID}
      />
    </View>
  );
}

export default function RfqInboxScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir: "row" | "row-reverse" = isRTL ? "row-reverse" : "row";
  const textAlign: "left" | "right" = isRTL ? "right" : "left";
  const egp = t("common.egp");

  const [state, setState] = useState<LoadState>("loading");
  const [items, setItems] = useState<Rfq[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<DetailState>("loading");
  const [detail, setDetail] = useState<RfqDetail | null>(null);

  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [leadTime, setLeadTime] = useState("");
  const [moq, setMoq] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listRfqs({ limit: PAGE });
      setItems(res.data ?? []);
      setCursor(res.meta?.has_next ? (res.meta?.cursor ?? null) : null);
      setState("ready");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setState(status === 401 || status === 403 ? "restricted" : "error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listRfqs({ limit: PAGE, cursor });
      setItems((prev) => [...prev, ...(res.data ?? [])]);
      setCursor(res.meta?.has_next ? (res.meta?.cursor ?? null) : null);
    } catch {
      // keep what we have; surface nothing destructive
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  const resetForm = useCallback(() => {
    setPrice("");
    setCurrency("EGP");
    setLeadTime("");
    setMoq("");
    setMessage("");
  }, []);

  const openDetail = useCallback(
    async (id: string) => {
      setDetailId(id);
      setDetailState("loading");
      setDetail(null);
      resetForm();
      try {
        const res = await getRfq(id);
        setDetail(res.data ?? null);
        setDetailState(res.data ? "ready" : "error");
      } catch {
        setDetailState("error");
      }
    },
    [resetForm],
  );

  const closeDetail = useCallback(() => {
    setDetailId(null);
    setDetail(null);
  }, []);

  const submit = useCallback(async () => {
    if (!detailId || submitting) return;
    const priceQuote = numOrUndef(price);
    if (priceQuote === undefined || priceQuote <= 0) {
      Alert.alert(t("business.rfqInbox.priceRequired"));
      return;
    }
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const body: SubmitRfqOfferBody = {
      price_quote: priceQuote,
      currency: currency.trim() || undefined,
      lead_time_days: intOrUndef(leadTime),
      moq: numOrUndef(moq),
      message: message.trim() || undefined,
    };
    try {
      await submitRfqOffer(detailId, body);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("business.rfqInbox.offerError"));
      setSubmitting(false);
      return;
    }
    // Offer was accepted by the server — report success regardless of the
    // best-effort refresh below, so a refetch failure never falsely claims the
    // quote failed (and risks a duplicate submission).
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetForm();
    Alert.alert(t("business.rfqInbox.offerSent"));
    try {
      const fresh = await getRfq(detailId);
      setDetail(fresh.data ?? null);
      setItems((prev) =>
        prev.map((r) =>
          r.id === detailId ? { ...r, offer_count: r.offer_count + 1 } : r,
        ),
      );
    } catch {
      // Refresh is best-effort; the quote is already recorded server-side.
    }
    setSubmitting(false);
  }, [
    detailId,
    submitting,
    price,
    currency,
    leadTime,
    moq,
    message,
    resetForm,
    t,
  ]);

  const myOffers: RfqOffer[] = detail?.offers.filter((o) => o.is_mine) ?? [];
  const alreadyOffered = myOffers.length > 0;
  const canOffer =
    detail != null &&
    detail.status === "open" &&
    !detail.viewer_is_buyer &&
    !alreadyOffered;

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
          testID="rfq-back"
        >
          <Feather
            name={isRTL ? "arrow-right" : "arrow-left"}
            size={22}
            color={colors.foreground}
          />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("business.rfqInbox.title")}
        </AppText>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleRefresh();
          }}
          style={styles.iconBtn}
          hitSlop={12}
          testID="rfq-refresh"
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
            testID="rfq-become-business"
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
            {t("business.rfqInbox.errorTitle")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("business.rfqInbox.errorHint")}
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
            testID="rfq-retry"
          >
            <Feather name="refresh-cw" size={16} color={colors.primaryForeground} />
            <AppText style={[styles.ctaText, { color: colors.primaryForeground }]}>
              {t("common.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.stateWrap}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={52}
            color={colors.mutedForeground}
          />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("business.rfqInbox.empty")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("business.rfqInbox.emptyHint")}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListHeaderComponent={
            <AppText
              style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}
            >
              {t("business.rfqInbox.subtitle")}
            </AppText>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={colors.primary}
                style={styles.footerLoader}
              />
            ) : cursor ? (
              <Pressable
                onPress={loadMore}
                style={[styles.loadMore, { borderColor: colors.border }]}
                testID="rfq-load-more"
              >
                <AppText style={[styles.loadMoreText, { color: colors.primary }]}>
                  {t("common.loadMore")}
                </AppText>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                openDetail(item.id);
              }}
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
              testID={`rfq-card-${item.id}`}
            >
              <View style={[styles.cardTop, { flexDirection: rowDir }]}>
                <View
                  style={[styles.catChip, { backgroundColor: colors.primary + "1A" }]}
                >
                  <AppText style={[styles.catChipText, { color: colors.primary }]}>
                    {t(`business.rfqInbox.category.${item.category}`)}
                  </AppText>
                </View>
                {item.status !== "open" ? (
                  <View
                    style={[
                      styles.statusChip,
                      { backgroundColor: colors.mutedForeground + "22" },
                    ]}
                  >
                    <AppText
                      style={[styles.statusChipText, { color: colors.mutedForeground }]}
                    >
                      {t(`business.rfqInbox.rfqStatus.${item.status}`)}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText
                style={[styles.cardTitle, { color: colors.foreground, textAlign }]}
                numberOfLines={2}
              >
                {item.title}
              </AppText>
              <View style={styles.cardMeta}>
                {item.quantity ? (
                  <MetaRow
                    icon="package"
                    label={t("business.rfqInbox.quantityLabel")}
                    value={`${item.quantity}${item.unit ? ` ${item.unit}` : ""}`}
                    colors={colors}
                    rowDir={rowDir}
                  />
                ) : null}
                {item.target_price_max ? (
                  <MetaRow
                    icon="tag"
                    label={t("business.rfqInbox.targetPriceLabel")}
                    value={`${item.target_price_max} ${egp}`}
                    colors={colors}
                    rowDir={rowDir}
                  />
                ) : null}
                {item.destination_country ? (
                  <MetaRow
                    icon="map-pin"
                    label={t("business.rfqInbox.destinationLabel")}
                    value={item.destination_country}
                    colors={colors}
                    rowDir={rowDir}
                  />
                ) : null}
              </View>
              <View style={[styles.cardFoot, { flexDirection: rowDir }]}>
                <View style={[styles.offerCount, { flexDirection: rowDir }]}>
                  <Feather name="users" size={13} color={colors.mutedForeground} />
                  <AppText
                    style={[styles.offerCountText, { color: colors.mutedForeground }]}
                  >
                    {item.offer_count} {t("business.rfqInbox.offersWord")}
                  </AppText>
                </View>
                <View style={[styles.viewLink, { flexDirection: rowDir }]}>
                  <AppText style={[styles.viewLinkText, { color: colors.primary }]}>
                    {t("business.rfqInbox.viewDetails")}
                  </AppText>
                  <Feather
                    name={isRTL ? "chevron-left" : "chevron-right"}
                    size={16}
                    color={colors.primary}
                  />
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal
        visible={detailId != null}
        animationType="slide"
        onRequestClose={closeDetail}
      >
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
              onPress={closeDetail}
              style={styles.iconBtn}
              hitSlop={12}
              testID="rfq-detail-close"
            >
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
            <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
              {t("business.rfqInbox.detailTitle")}
            </AppText>
            <View style={styles.iconBtn} />
          </View>

          {detailState === "loading" ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : detailState === "error" || !detail ? (
            <View style={styles.stateWrap}>
              <Feather name="wifi-off" size={48} color={colors.mutedForeground} />
              <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
                {t("business.rfqInbox.errorHint")}
              </AppText>
              <Pressable
                onPress={() => detailId && openDetail(detailId)}
                style={[
                  styles.cta,
                  { backgroundColor: colors.primary, borderRadius: colors.radius },
                ]}
                testID="rfq-detail-retry"
              >
                <Feather
                  name="refresh-cw"
                  size={16}
                  color={colors.primaryForeground}
                />
                <AppText style={[styles.ctaText, { color: colors.primaryForeground }]}>
                  {t("common.retry")}
                </AppText>
              </Pressable>
            </View>
          ) : (
            <KeyboardAvoidingView
              style={styles.flex}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <ScrollView
                contentContainerStyle={styles.detailScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={[styles.cardTop, { flexDirection: rowDir }]}>
                  <View
                    style={[
                      styles.catChip,
                      { backgroundColor: colors.primary + "1A" },
                    ]}
                  >
                    <AppText style={[styles.catChipText, { color: colors.primary }]}>
                      {t(`business.rfqInbox.category.${detail.category}`)}
                    </AppText>
                  </View>
                </View>
                <AppText
                  style={[styles.detailTitle, { color: colors.foreground, textAlign }]}
                >
                  {detail.title}
                </AppText>

                <View style={styles.detailMeta}>
                  {detail.quantity ? (
                    <MetaRow
                      icon="package"
                      label={t("business.rfqInbox.quantityLabel")}
                      value={`${detail.quantity}${detail.unit ? ` ${detail.unit}` : ""}`}
                      colors={colors}
                      rowDir={rowDir}
                    />
                  ) : null}
                  {detail.target_price_max ? (
                    <MetaRow
                      icon="tag"
                      label={t("business.rfqInbox.targetPriceLabel")}
                      value={`${detail.target_price_max} ${egp}`}
                      colors={colors}
                      rowDir={rowDir}
                    />
                  ) : null}
                  {detail.destination_country ? (
                    <MetaRow
                      icon="map-pin"
                      label={t("business.rfqInbox.destinationLabel")}
                      value={detail.destination_country}
                      colors={colors}
                      rowDir={rowDir}
                    />
                  ) : null}
                  {detail.deadline ? (
                    <MetaRow
                      icon="clock"
                      label={t("business.rfqInbox.deadlineLabel")}
                      value={formatDate(detail.deadline, isRTL)}
                      colors={colors}
                      rowDir={rowDir}
                    />
                  ) : null}
                </View>

                {detail.description ? (
                  <AppText
                    style={[
                      styles.detailDesc,
                      { color: colors.mutedForeground, textAlign },
                    ]}
                  >
                    {detail.description}
                  </AppText>
                ) : null}

                {myOffers.length > 0 ? (
                  <View style={styles.myOffers}>
                    <AppText
                      style={[styles.section, { color: colors.foreground, textAlign }]}
                    >
                      {t("business.rfqInbox.offersTitle")}
                    </AppText>
                    {myOffers.map((o) => {
                      const tone = offerStatusTone(o.status, colors);
                      return (
                        <View
                          key={o.id}
                          style={[
                            styles.myOfferRow,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                              borderRadius: colors.radius,
                              flexDirection: rowDir,
                            },
                          ]}
                        >
                          <AppText
                            style={[styles.myOfferPrice, { color: colors.foreground }]}
                          >
                            {o.price_quote} {o.currency || egp}
                          </AppText>
                          <View
                            style={[styles.statusChip, { backgroundColor: tone + "22" }]}
                          >
                            <AppText style={[styles.statusChipText, { color: tone }]}>
                              {t(`business.rfqInbox.offerStatus.${o.status}`)}
                            </AppText>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                {canOffer ? (
                  <View style={styles.form}>
                    <AppText
                      style={[styles.section, { color: colors.foreground, textAlign }]}
                    >
                      {t("business.rfqInbox.yourOffer")}
                    </AppText>
                    <FormField
                      label={t("business.rfqInbox.priceQuote")}
                      value={price}
                      onChange={setPrice}
                      keyboardType="numeric"
                      colors={colors}
                      textAlign={textAlign}
                      inputAlign={textAlign}
                      testID="rfq-price"
                    />
                    <FormField
                      label={t("business.rfqInbox.currency")}
                      value={currency}
                      onChange={setCurrency}
                      colors={colors}
                      textAlign={textAlign}
                      inputAlign={textAlign}
                      testID="rfq-currency"
                    />
                    <FormField
                      label={t("business.rfqInbox.leadTimeDays")}
                      value={leadTime}
                      onChange={setLeadTime}
                      keyboardType="numeric"
                      colors={colors}
                      textAlign={textAlign}
                      inputAlign={textAlign}
                      testID="rfq-leadtime"
                    />
                    <FormField
                      label={t("business.rfqInbox.moq")}
                      value={moq}
                      onChange={setMoq}
                      keyboardType="numeric"
                      colors={colors}
                      textAlign={textAlign}
                      inputAlign={textAlign}
                      testID="rfq-moq"
                    />
                    <FormField
                      label={t("business.rfqInbox.message")}
                      value={message}
                      onChange={setMessage}
                      placeholder={t("business.rfqInbox.messagePh")}
                      multiline
                      colors={colors}
                      textAlign={textAlign}
                      inputAlign={textAlign}
                      testID="rfq-message"
                    />
                    <Pressable
                      onPress={submit}
                      disabled={submitting}
                      style={[
                        styles.submitBtn,
                        {
                          backgroundColor: colors.primary,
                          borderRadius: colors.radius,
                        },
                      ]}
                      testID="rfq-submit"
                    >
                      {submitting ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.primaryForeground}
                        />
                      ) : (
                        <>
                          <Feather
                            name="send"
                            size={16}
                            color={colors.primaryForeground}
                          />
                          <AppText
                            style={[
                              styles.submitText,
                              { color: colors.primaryForeground },
                            ]}
                          >
                            {t("business.rfqInbox.submitOffer")}
                          </AppText>
                        </>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.note,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderRadius: colors.radius,
                        flexDirection: rowDir,
                      },
                    ]}
                  >
                    <Feather
                      name={
                        detail.viewer_is_buyer
                          ? "info"
                          : alreadyOffered
                            ? "check-circle"
                            : "lock"
                      }
                      size={16}
                      color={colors.mutedForeground}
                    />
                    <AppText
                      style={[styles.noteText, { color: colors.mutedForeground, textAlign }]}
                    >
                      {detail.viewer_is_buyer
                        ? t("business.rfqInbox.ownRequest")
                        : alreadyOffered
                          ? t("business.rfqInbox.alreadyOffered")
                          : t("business.rfqInbox.notOpen")}
                    </AppText>
                  </View>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
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
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 },
  subtitle: {
    fontSize: 13.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 6,
  },
  card: { padding: 14, marginBottom: 12, borderWidth: 1, gap: 10 },
  cardTop: { alignItems: "center", gap: 8 },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  catChipText: { fontSize: 11.5, fontFamily: "Inter_600SemiBold" },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusChipText: { fontSize: 11.5, fontFamily: "Inter_600SemiBold" },
  cardTitle: { fontSize: 15.5, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  cardMeta: { gap: 7 },
  metaRow: { alignItems: "center", gap: 8 },
  metaLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  metaValue: { flex: 1, fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  cardFoot: {
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  offerCount: { alignItems: "center", gap: 6 },
  offerCountText: { fontSize: 12.5, fontFamily: "Inter_500Medium" },
  viewLink: { alignItems: "center", gap: 4 },
  viewLinkText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  footerLoader: { marginVertical: 16 },
  loadMore: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
  },
  loadMoreText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  detailScroll: { padding: 16, paddingBottom: 140 },
  detailTitle: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    lineHeight: 26,
    marginTop: 10,
    marginBottom: 12,
  },
  detailMeta: { gap: 9 },
  detailDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    marginTop: 14,
  },
  myOffers: { marginTop: 18, gap: 8 },
  myOfferRow: {
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
  },
  myOfferPrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
  section: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  form: { marginTop: 18, gap: 2 },
  field: { marginTop: 10, gap: 6 },
  label: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  inputMultiline: { minHeight: 88, textAlignVertical: "top", paddingTop: 10 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 18,
  },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  note: {
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
  },
  noteText: { flex: 1, fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
