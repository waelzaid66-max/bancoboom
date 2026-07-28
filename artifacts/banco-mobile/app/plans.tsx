import { Feather, Ionicons } from "@/components/icons";
import {
  getMySubscription,
  listPlans,
  subscribe,
  confirmSubscription,
  type Plan,
  type SubscriptionMe,
  type SubscribeBodyPaymentMethod,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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

type LoadState = "loading" | "ready" | "error";
type PayState = "idle" | "processing" | "done" | "error" | "pending";

type Method = SubscribeBodyPaymentMethod;

const METHODS: {
  key: Method;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  { key: "vodafone_cash", icon: "phone-portrait-outline" },
  { key: "fawry", icon: "cash-outline" },
  { key: "instapay", icon: "flash-outline" },
  { key: "bank_transfer", icon: "business-outline" },
];

function fmtMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(iso: string, lang: string): string {
  try {
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function PlansScreen() {
  const colors = useColors();
  const { t, isRTL, lang } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const egp = t("common.egp");

  const [state, setState] = useState<LoadState>("loading");
  const [me, setMe] = useState<SubscriptionMe | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [method, setMethod] = useState<Method>("vodafone_cash");
  const [payState, setPayState] = useState<PayState>("idle");

  const load = useCallback(async () => {
    try {
      const [subRes, plansRes] = await Promise.all([
        getMySubscription(),
        listPlans(),
      ]);
      setMe(subRes.data ?? null);
      setPlans(plansRes.data ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const plan = me?.plan;
  const subscription = me?.subscription;
  const usage = me?.usage;

  const openSubscribe = (p: Plan) => {
    setSelectedPlan(p);
    setMethod("vodafone_cash");
    setPayState("idle");
    setSheetOpen(true);
  };

  // Poll the read-only intent status until it leaves `pending` (the signed
  // provider webhook settles it server-side) or we time out.
  const pollIntentStatus = useCallback(async (intentId: string) => {
    const ATTEMPTS = 12;
    const DELAY_MS = 2500;
    for (let i = 0; i < ATTEMPTS; i++) {
      try {
        const res = await confirmSubscription(intentId);
        const status = res.data?.status;
        if (status && status !== "pending") return { status };
      } catch {
        // transient — keep polling
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
    return { status: "pending" as const };
  }, []);

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    try {
      setPayState("processing");
      const res = await subscribe({
        plan_slug: selectedPlan.slug,
        payment_method: method,
      });
      const result = res.data;
      if (!result) throw new Error("no result");

      // Wallet settles immediately; an Egyptian rail returns a checkout intent.
      if (result.mode === "active") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPayState("done");
        load();
        return;
      }

      const intent = result.intent;
      if (!intent?.intent_id || !intent.checkout_url) {
        throw new Error("missing checkout");
      }
      await WebBrowser.openBrowserAsync(intent.checkout_url);
      const polled = await pollIntentStatus(intent.intent_id);
      if (polled.status === "completed") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPayState("done");
        load();
      } else if (polled.status === "pending") {
        setPayState("pending");
        load();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPayState("error");
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPayState("error");
    }
  };

  const statusLabel = subscription
    ? t(`plans.status.${subscription.status}`)
    : t("plans.status.baseline");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
          testID="plans-back"
        >
          <Feather
            name={isRTL ? "arrow-right" : "arrow-left"}
            size={22}
            color={colors.foreground}
          />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("plans.title")}
        </AppText>
        <View style={styles.backBtn} />
      </View>

      {state === "loading" ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : state === "error" ? (
        <View style={styles.stateWrap}>
          <Feather name="wifi-off" size={52} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("plans.errorTitle")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("plans.errorBody")}
          </AppText>
          <Pressable
            onPress={() => {
              setState("loading");
              load();
            }}
            style={[
              styles.retryBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="plans-retry"
          >
            <Feather name="refresh-cw" size={16} color={colors.primaryForeground} />
            <AppText style={[styles.retryText, { color: colors.primaryForeground }]}>
              {t("common.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Current plan card */}
          <View
            style={[
              styles.planCard,
              { backgroundColor: colors.primary, borderRadius: colors.radius + 4 },
            ]}
          >
            <View
              style={[
                styles.planTopRow,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <AppText
                style={[styles.planLabel, { color: colors.primaryForeground }]}
              >
                {t("plans.currentPlan")}
              </AppText>
              <Ionicons name="ribbon" size={20} color={colors.primaryForeground} />
            </View>
            <AppText
              style={[
                styles.planName,
                {
                  color: colors.primaryForeground,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            >
              {plan?.name ?? "—"}
            </AppText>
            <AppText
              style={[
                styles.planPrice,
                {
                  color: colors.primaryForeground,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            >
              {egp} {fmtMoney(plan?.monthly_price)} {t("plans.perMonth")}
            </AppText>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: colors.primaryForeground + "26" },
              ]}
            >
              <AppText
                style={[styles.statusText, { color: colors.primaryForeground }]}
              >
                {statusLabel}
              </AppText>
            </View>
            {subscription && (
              <AppText
                style={[
                  styles.renewText,
                  {
                    color: colors.primaryForeground,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
              >
                {t("plans.expires")}: {formatDate(subscription.expires_at, lang)}
              </AppText>
            )}
          </View>

          {/* Usage */}
          {usage && (
            <View
              style={[
                styles.usageCard,
                { backgroundColor: colors.card, borderRadius: colors.radius },
              ]}
            >
              <UsageRow
                label={t("plans.listingsThisMonth")}
                used={usage.listings_this_month}
                cap={usage.listing_quota}
                colors={colors}
                isRTL={isRTL}
                unlimitedLabel={t("plans.unlimited")}
              />
              <View style={[styles.usageDivider, { backgroundColor: colors.border }]} />
              <UsageRow
                label={t("plans.activeListings")}
                used={usage.active_listings}
                cap={usage.active_listing_cap}
                colors={colors}
                isRTL={isRTL}
                unlimitedLabel={t("plans.unlimited")}
              />
            </View>
          )}

          <View style={styles.sectionHead}>
            <AppText
              style={[
                styles.sectionTitle,
                { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {t("plans.availablePackages")}
            </AppText>
          </View>

          {plans.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderRadius: colors.radius },
              ]}
            >
              <Feather name="package" size={40} color={colors.mutedForeground} />
              <AppText style={[styles.emptyTitle, { color: colors.foreground }]}>
                {t("plans.emptyTitle")}
              </AppText>
            </View>
          ) : (
            plans.map((p) => {
              const isCurrent = plan?.slug === p.slug;
              const planName = lang === "ar" && p.name_ar ? p.name_ar : p.name;
              return (
                <View
                  key={p.id}
                  style={[
                    styles.packageCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isCurrent ? colors.primary : colors.border,
                      borderRadius: colors.radius,
                    },
                  ]}
                  testID={`plan-${p.slug}`}
                >
                  <View
                    style={[
                      styles.packageHead,
                      { flexDirection: isRTL ? "row-reverse" : "row" },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <AppText
                        style={[
                          styles.packageName,
                          {
                            color: colors.foreground,
                            textAlign: isRTL ? "right" : "left",
                          },
                        ]}
                      >
                        {planName}
                      </AppText>
                      <AppText
                        style={[
                          styles.packagePrice,
                          {
                            color: colors.primary,
                            textAlign: isRTL ? "right" : "left",
                          },
                        ]}
                      >
                        {egp} {fmtMoney(p.monthly_price)}{" "}
                        <AppText
                          style={[
                            styles.packagePriceUnit,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {t("plans.perMonth")}
                        </AppText>
                      </AppText>
                    </View>
                    {isCurrent && (
                      <View
                        style={[
                          styles.currentBadge,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <AppText
                          style={[
                            styles.currentBadgeText,
                            { color: colors.primaryForeground },
                          ]}
                        >
                          {t("plans.current")}
                        </AppText>
                      </View>
                    )}
                  </View>

                  <View
                    style={[styles.packageDivider, { backgroundColor: colors.border }]}
                  />

                  <SpecRow
                    label={t("plans.listingQuota")}
                    value={
                      p.listing_quota === null
                        ? t("plans.unlimited")
                        : String(p.listing_quota)
                    }
                    colors={colors}
                    isRTL={isRTL}
                  />
                  <SpecRow
                    label={t("plans.activeCap")}
                    value={
                      p.active_listing_cap === null
                        ? t("plans.unlimited")
                        : String(p.active_listing_cap)
                    }
                    colors={colors}
                    isRTL={isRTL}
                  />
                  <SpecRow
                    label={t("plans.boostPerDay")}
                    value={`${egp} ${fmtMoney(p.boost_price)}`}
                    colors={colors}
                    isRTL={isRTL}
                  />
                  <SpecRow
                    label={t("plans.cplCall")}
                    value={`${egp} ${fmtMoney(p.cpl_call)}`}
                    colors={colors}
                    isRTL={isRTL}
                  />

                  {!isCurrent && (
                    <Pressable
                      onPress={() => openSubscribe(p)}
                      style={[
                        styles.subscribeBtn,
                        {
                          backgroundColor: colors.primary,
                          borderRadius: colors.radius,
                        },
                      ]}
                      testID={`plan-subscribe-${p.slug}`}
                    >
                      <AppText
                        style={[
                          styles.subscribeBtnText,
                          { color: colors.primaryForeground },
                        ]}
                      >
                        {t("plans.choosePlan")}
                      </AppText>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => payState !== "processing" && setSheetOpen(false)}
        />
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.background,
              borderTopLeftRadius: colors.radius + 8,
              borderTopRightRadius: colors.radius + 8,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          {payState === "done" ? (
            <View style={styles.doneWrap}>
              <View
                style={[styles.doneIcon, { backgroundColor: colors.primary + "18" }]}
              >
                <Feather name="check" size={32} color={colors.primary} />
              </View>
              <AppText style={[styles.doneTitle, { color: colors.foreground }]}>
                {t("plans.doneTitle")}
              </AppText>
              <AppText style={[styles.doneText, { color: colors.mutedForeground }]}>
                {t("plans.doneBody", { plan: selectedPlan?.name ?? "" })}
              </AppText>
              <Pressable
                onPress={() => setSheetOpen(false)}
                style={[
                  styles.payBtn,
                  { backgroundColor: colors.primary, borderRadius: colors.radius },
                ]}
                testID="subscribe-done"
              >
                <AppText
                  style={[styles.payBtnText, { color: colors.primaryForeground }]}
                >
                  {t("plans.done")}
                </AppText>
              </Pressable>
            </View>
          ) : payState === "pending" ? (
            <View style={styles.doneWrap}>
              <View
                style={[styles.doneIcon, { backgroundColor: colors.primary + "18" }]}
              >
                <Feather name="clock" size={32} color={colors.primary} />
              </View>
              <AppText style={[styles.doneTitle, { color: colors.foreground }]}>
                {t("plans.awaitingTitle")}
              </AppText>
              <AppText style={[styles.doneText, { color: colors.mutedForeground }]}>
                {t("plans.awaitingBody")}
              </AppText>
              <Pressable
                onPress={() => setSheetOpen(false)}
                style={[
                  styles.payBtn,
                  { backgroundColor: colors.primary, borderRadius: colors.radius },
                ]}
                testID="subscribe-pending"
              >
                <AppText
                  style={[styles.payBtnText, { color: colors.primaryForeground }]}
                >
                  {t("plans.done")}
                </AppText>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.modalHandle} />
              <AppText
                style={[
                  styles.modalTitle,
                  { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {t("plans.subscribeTo", { plan: selectedPlan?.name ?? "" })}
              </AppText>
              <AppText
                style={[
                  styles.modalSub,
                  {
                    color: colors.mutedForeground,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
              >
                {egp} {fmtMoney(selectedPlan?.monthly_price)} {t("plans.perMonth")}
              </AppText>

              <AppText
                style={[
                  styles.fieldLabel,
                  {
                    color: colors.mutedForeground,
                    marginTop: 18,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
              >
                {t("plans.methodLabel")}
              </AppText>
              <View style={styles.methodGrid}>
                {METHODS.map((m) => {
                  const active = m.key === method;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => setMethod(m.key)}
                      style={[
                        styles.methodChip,
                        {
                          backgroundColor: active
                            ? colors.primary + "14"
                            : colors.card,
                          borderColor: active ? colors.primary : colors.border,
                          borderRadius: colors.radius,
                          flexDirection: isRTL ? "row-reverse" : "row",
                        },
                      ]}
                      testID={`subscribe-method-${m.key}`}
                    >
                      <Ionicons
                        name={m.icon}
                        size={18}
                        color={active ? colors.primary : colors.mutedForeground}
                      />
                      <AppText
                        style={[
                          styles.methodText,
                          { color: active ? colors.primary : colors.foreground },
                        ]}
                      >
                        {t(`plans.methods.${m.key}`)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              {payState === "error" && (
                <AppText style={[styles.errorText, { color: colors.destructive }]}>
                  {t("plans.subscribeFailed")}
                </AppText>
              )}

              <Pressable
                onPress={handleSubscribe}
                disabled={payState === "processing"}
                style={[
                  styles.payBtn,
                  {
                    backgroundColor:
                      payState === "processing" ? colors.secondary : colors.primary,
                    borderRadius: colors.radius,
                  },
                ]}
                testID="subscribe-submit"
              >
                {payState === "processing" ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <AppText
                    style={[styles.payBtnText, { color: colors.primaryForeground }]}
                  >
                    {t("plans.pay", {
                      amount: `${egp} ${fmtMoney(selectedPlan?.monthly_price)}`,
                    })}
                  </AppText>
                )}
              </Pressable>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

function UsageRow({
  label,
  used,
  cap,
  colors,
  isRTL,
  unlimitedLabel,
}: {
  label: string;
  used: number;
  cap: number | null;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
  unlimitedLabel: string;
}) {
  const unlimited = cap === null || cap === undefined;
  const pct = unlimited || cap === 0 ? 0 : Math.min(100, Math.round((used / cap) * 100));
  return (
    <View style={styles.usageRow}>
      <View
        style={[
          styles.usageTop,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <AppText style={[styles.usageLabel, { color: colors.mutedForeground }]}>
          {label}
        </AppText>
        <AppText style={[styles.usageValue, { color: colors.foreground }]}>
          {used} {unlimited ? "/ ∞" : `/ ${cap}`}
        </AppText>
      </View>
      {!unlimited && (
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.fill,
              { width: `${pct}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>
      )}
    </View>
  );
}

function SpecRow({
  label,
  value,
  colors,
  isRTL,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
}) {
  return (
    <View
      style={[styles.specRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
    >
      <AppText style={[styles.specLabel, { color: colors.mutedForeground }]}>
        {label}
      </AppText>
      <AppText style={[styles.specValue, { color: colors.foreground }]}>
        {value}
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
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  stateTitle: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  stateText: { fontSize: 14, textAlign: "center" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  retryText: { fontSize: 15, fontWeight: "600" },
  content: { padding: 16, paddingBottom: 48 },
  planCard: { padding: 20, marginBottom: 16 },
  planTopRow: { alignItems: "center", justifyContent: "space-between" },
  planLabel: { fontSize: 13, fontWeight: "500", opacity: 0.9 },
  planName: { fontSize: 26, fontWeight: "700", marginTop: 10 },
  planPrice: { fontSize: 15, marginTop: 2, opacity: 0.95 },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 14,
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  renewText: { fontSize: 13, marginTop: 10, opacity: 0.9 },
  usageCard: { padding: 16, marginBottom: 16 },
  usageRow: { gap: 8 },
  usageDivider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  usageTop: { alignItems: "center", justifyContent: "space-between" },
  usageLabel: { fontSize: 14 },
  usageValue: { fontSize: 14, fontWeight: "600" },
  track: { height: 6, borderRadius: 999, overflow: "hidden" },
  fill: { height: 6, borderRadius: 999 },
  sectionHead: { marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  emptyCard: { padding: 32, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 15, fontWeight: "600" },
  packageCard: { padding: 16, marginBottom: 12, borderWidth: 1 },
  packageHead: { alignItems: "flex-start", justifyContent: "space-between" },
  packageName: { fontSize: 17, fontWeight: "700" },
  packagePrice: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  packagePriceUnit: { fontSize: 13, fontWeight: "400" },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  currentBadgeText: { fontSize: 11, fontWeight: "700" },
  packageDivider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  specRow: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  specLabel: { fontSize: 13 },
  specValue: { fontSize: 13, fontWeight: "600" },
  subscribeBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    marginTop: 8,
  },
  subscribeBtnText: { fontSize: 15, fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: { paddingHorizontal: 20, paddingTop: 10 },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#9994",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 19, fontWeight: "700" },
  modalSub: { fontSize: 14, marginTop: 4 },
  fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: 10 },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  methodChip: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  methodText: { fontSize: 14, fontWeight: "500" },
  methodHint: { fontSize: 12, marginTop: 12 },
  errorText: { fontSize: 14, marginTop: 14, fontWeight: "500" },
  payBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    marginTop: 20,
  },
  payBtnText: { fontSize: 16, fontWeight: "600" },
  doneWrap: { alignItems: "center", paddingVertical: 20, gap: 12 },
  doneIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: { fontSize: 19, fontWeight: "700", textAlign: "center" },
  doneText: { fontSize: 14, textAlign: "center", paddingHorizontal: 20 },
});
