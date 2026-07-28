import { Feather, Ionicons } from "@/components/icons";
import {
  getWallet,
  listTransactions,
  getPromoAdSummary,
  createTopup,
  confirmTopup,
  type WalletState,
  type WalletTransaction,
  type WalletTransactionType,
  type PromoAdSummary,
  type CreateTopupBodyMethod,
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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

type LoadState = "loading" | "ready" | "error";
type PayState = "idle" | "processing" | "done" | "error" | "pending";
type Method = CreateTopupBodyMethod;

const PAGE = 50;
const PRESETS = [100, 250, 500, 1000];

const METHODS: {
  key: Method;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  { key: "vodafone_cash", icon: "phone-portrait-outline" },
  { key: "fawry", icon: "cash-outline" },
  { key: "instapay", icon: "flash-outline" },
  { key: "bank_transfer", icon: "business-outline" },
];

// Direction + glyph per ledger entry type. `credit: null` = neutral (adjustment
// can go either way), so we show the amount without a +/- we can't vouch for.
const TX_META: Record<
  WalletTransactionType,
  { icon: React.ComponentProps<typeof Feather>["name"]; credit: boolean | null }
> = {
  wallet_topup: { icon: "arrow-down-circle", credit: true },
  refund: { icon: "rotate-ccw", credit: true },
  boost_charge: { icon: "zap", credit: false },
  subscription_charge: { icon: "star", credit: false },
  lead_charge: { icon: "phone", credit: false },
  adjustment: { icon: "sliders", credit: null },
};

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

export default function WalletScreen() {
  const colors = useColors();
  const { t, isRTL, lang } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const egp = t("common.egp");
  const rowDir: "row" | "row-reverse" = isRTL ? "row-reverse" : "row";

  const [state, setState] = useState<LoadState>("loading");
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [promo, setPromo] = useState<PromoAdSummary | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState(false);
  const [method, setMethod] = useState<Method>("vodafone_cash");
  const [payState, setPayState] = useState<PayState>("idle");
  const [newBalance, setNewBalance] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [walletRes, txRes] = await Promise.all([
        getWallet(),
        listTransactions({ limit: PAGE }),
      ]);
      setWallet(walletRes.data ?? null);
      setTxns(txRes.data ?? []);
      setCursor(txRes.meta?.has_next ? txRes.meta?.cursor ?? null : null);
      setState("ready");
    } catch {
      setState("error");
    }
    // Promo ad-credit is best-effort: a promo fetch failure must never block the
    // wallet itself, and we only ever show real, non-expired credit.
    try {
      const promoRes = await getPromoAdSummary();
      setPromo(promoRes.data ?? null);
    } catch {
      setPromo(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listTransactions({ limit: PAGE, cursor });
      setTxns((prev) => [...prev, ...(res.data ?? [])]);
      setCursor(res.meta?.has_next ? res.meta?.cursor ?? null : null);
    } catch {
      // Keep what we have; the user can retry by scrolling/pressing again.
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  const openTopup = () => {
    setAmount("");
    setAmountError(false);
    setMethod("vodafone_cash");
    setPayState("idle");
    setNewBalance(null);
    setSheetOpen(true);
  };

  // Poll the read-only intent status until it leaves `pending` (settled
  // server-side by the signed provider webhook) or we time out.
  const pollTopup = useCallback(async (intentId: string) => {
    const ATTEMPTS = 12;
    const DELAY_MS = 2500;
    for (let i = 0; i < ATTEMPTS; i++) {
      try {
        const res = await confirmTopup(intentId);
        const status = res.data?.status;
        if (status && status !== "pending") {
          return { status, balance: res.data?.balance ?? null };
        }
      } catch {
        // transient — keep polling
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
    return { status: "pending" as const, balance: null };
  }, []);

  const handleTopup = async () => {
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) {
      setAmountError(true);
      return;
    }
    setAmountError(false);
    try {
      setPayState("processing");
      const res = await createTopup({ amount: amt, method });
      const intent = res.data;
      // A top-up can only proceed if the rail returns a real hosted checkout.
      // No URL → we must not pretend it succeeded.
      if (!intent?.intent_id || !intent.checkout_url) {
        throw new Error("no checkout");
      }
      await WebBrowser.openBrowserAsync(intent.checkout_url);
      const polled = await pollTopup(intent.intent_id);
      if (polled.status === "completed") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setNewBalance(polled.balance);
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

  const promoBalance = promo ? Number(promo.balance) : 0;
  const showPromo = !!promo && promo.campaign_enabled;

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
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"))}
          style={styles.backBtn}
          hitSlop={12}
          testID="wallet-back"
        >
          <Feather
            name={isRTL ? "arrow-right" : "arrow-left"}
            size={22}
            color={colors.foreground}
          />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("wallet.title")}
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
            {t("wallet.errorTitle")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("wallet.errorBody")}
          </AppText>
          <Pressable
            onPress={() => {
              setState("loading");
              load();
            }}
            style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            testID="wallet-retry"
          >
            <Feather name="refresh-cw" size={16} color={colors.primaryForeground} />
            <AppText style={[styles.retryText, { color: colors.primaryForeground }]}>
              {t("common.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Balance */}
          <View
            style={[
              styles.balanceCard,
              { backgroundColor: colors.primary, borderRadius: colors.radius + 4 },
            ]}
          >
            <View style={[styles.balanceTop, { flexDirection: rowDir }]}>
              <AppText style={[styles.balanceLabel, { color: colors.primaryForeground }]}>
                {t("wallet.available")}
              </AppText>
              <Ionicons name="wallet" size={20} color={colors.primaryForeground} />
            </View>
            <AppText
              style={[
                styles.balanceValue,
                { color: colors.primaryForeground, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {egp} {fmtMoney(wallet?.balance)}
            </AppText>
            <AppText
              style={[
                styles.balanceHint,
                { color: colors.primaryForeground, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {t("wallet.balanceHint")}
            </AppText>
          </View>

          <Pressable
            onPress={openTopup}
            style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            testID="wallet-add-funds"
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
            <AppText style={[styles.addBtnText, { color: colors.primaryForeground }]}>
              {t("wallet.addFunds")}
            </AppText>
          </Pressable>

          {/* Free ad credit (promo) — only when the campaign applies to this user */}
          {showPromo ? (
            <View
              style={[
                styles.promoCard,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
              ]}
            >
              <View style={[styles.promoHead, { flexDirection: rowDir }]}>
                <Feather name="gift" size={18} color={colors.primary} />
                <AppText style={[styles.promoTitle, { color: colors.foreground }]}>
                  {t("wallet.promo.title")}
                </AppText>
              </View>
              {promoBalance > 0 ? (
                <>
                  <AppText
                    style={[
                      styles.promoValue,
                      { color: colors.primary, textAlign: isRTL ? "right" : "left" },
                    ]}
                  >
                    {egp} {fmtMoney(promo?.balance)}
                  </AppText>
                  {promo?.expires_at ? (
                    <AppText
                      style={[
                        styles.promoMeta,
                        { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                      ]}
                    >
                      {t("wallet.promo.expires", { date: formatDate(promo.expires_at, lang) })}
                    </AppText>
                  ) : null}
                </>
              ) : (
                <AppText
                  style={[
                    styles.promoMeta,
                    { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                  ]}
                >
                  {t("wallet.promo.none")}
                </AppText>
              )}
              {promo?.campaign_active &&
              (promo?.months_remaining ?? 0) > 0 &&
              Number(promo?.monthly_amount ?? 0) > 0 ? (
                <AppText
                  style={[
                    styles.promoMeta,
                    { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                  ]}
                >
                  {t("wallet.promo.monthly", { amount: fmtMoney(promo?.monthly_amount) })}
                </AppText>
              ) : null}
            </View>
          ) : null}

          {/* Transactions */}
          <View style={styles.sectionHead}>
            <AppText
              style={[
                styles.sectionTitle,
                { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {t("wallet.transactions")}
            </AppText>
          </View>

          {txns.length === 0 ? (
            <View
              style={[styles.emptyCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}
            >
              <Feather name="inbox" size={40} color={colors.mutedForeground} />
              <AppText style={[styles.emptyTitle, { color: colors.foreground }]}>
                {t("wallet.emptyTitle")}
              </AppText>
              <AppText style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {t("wallet.emptyHint")}
              </AppText>
            </View>
          ) : (
            <View
              style={[styles.txCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}
            >
              {txns.map((tx, i) => {
                const meta = TX_META[tx.type];
                const value = Math.abs(parseFloat(tx.amount) || 0);
                const sign = meta.credit === true ? "+" : meta.credit === false ? "−" : "";
                const amountColor =
                  meta.credit === true
                    ? colors.primary
                    : meta.credit === false
                      ? colors.foreground
                      : colors.mutedForeground;
                return (
                  <View
                    key={tx.id}
                    style={[
                      styles.txRow,
                      {
                        flexDirection: rowDir,
                        borderTopColor: colors.border,
                        borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                      },
                    ]}
                    testID={`wallet-tx-${tx.id}`}
                  >
                    <View style={[styles.txIcon, { backgroundColor: amountColor + "18" }]}>
                      <Feather name={meta.icon} size={18} color={amountColor} />
                    </View>
                    <View style={styles.txBody}>
                      <AppText
                        style={[
                          styles.txLabel,
                          { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                        ]}
                        numberOfLines={1}
                      >
                        {tx.description?.trim() ? tx.description : t(`wallet.tx.${tx.type}`)}
                      </AppText>
                      <AppText
                        style={[
                          styles.txDate,
                          { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                        ]}
                      >
                        {formatDate(tx.created_at, lang)}
                      </AppText>
                    </View>
                    <AppText style={[styles.txAmount, { color: amountColor }]}>
                      {sign}
                      {egp} {fmtMoney(value)}
                    </AppText>
                  </View>
                );
              })}
              {cursor ? (
                <Pressable
                  onPress={loadMore}
                  disabled={loadingMore}
                  style={[styles.moreBtn, { borderTopColor: colors.border }]}
                  testID="wallet-load-more"
                >
                  {loadingMore ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <AppText style={[styles.moreText, { color: colors.primary }]}>
                      {t("common.loadMore")}
                    </AppText>
                  )}
                </Pressable>
              ) : null}
            </View>
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
              <View style={[styles.doneIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="check" size={32} color={colors.primary} />
              </View>
              <AppText style={[styles.doneTitle, { color: colors.foreground }]}>
                {t("wallet.doneTitle")}
              </AppText>
              {newBalance !== null ? (
                <AppText style={[styles.doneText, { color: colors.mutedForeground }]}>
                  {t("wallet.doneBody", { balance: `${egp} ${fmtMoney(newBalance)}` })}
                </AppText>
              ) : null}
              <Pressable
                onPress={() => setSheetOpen(false)}
                style={[styles.payBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                testID="wallet-done"
              >
                <AppText style={[styles.payBtnText, { color: colors.primaryForeground }]}>
                  {t("wallet.done")}
                </AppText>
              </Pressable>
            </View>
          ) : payState === "pending" ? (
            <View style={styles.doneWrap}>
              <View style={[styles.doneIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="clock" size={32} color={colors.primary} />
              </View>
              <AppText style={[styles.doneTitle, { color: colors.foreground }]}>
                {t("wallet.awaitingTitle")}
              </AppText>
              <AppText style={[styles.doneText, { color: colors.mutedForeground }]}>
                {t("wallet.awaitingBody")}
              </AppText>
              <Pressable
                onPress={() => setSheetOpen(false)}
                style={[styles.payBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                testID="wallet-pending"
              >
                <AppText style={[styles.payBtnText, { color: colors.primaryForeground }]}>
                  {t("wallet.done")}
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
                {t("wallet.addFunds")}
              </AppText>

              <AppText
                style={[
                  styles.fieldLabel,
                  { color: colors.mutedForeground, marginTop: 18, textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {t("wallet.amountLabel")}
              </AppText>
              <TextInput
                value={amount}
                onChangeText={(v) => {
                  setAmount(v.replace(/[^0-9.]/g, ""));
                  setAmountError(false);
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.amountInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: amountError ? colors.destructive : colors.border,
                    color: colors.foreground,
                    borderRadius: colors.radius,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                testID="wallet-amount"
              />
              <View style={styles.presetRow}>
                {PRESETS.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => {
                      setAmount(String(p));
                      setAmountError(false);
                    }}
                    style={[
                      styles.presetChip,
                      { borderColor: colors.border, borderRadius: colors.radius },
                    ]}
                    testID={`wallet-preset-${p}`}
                  >
                    <AppText style={[styles.presetText, { color: colors.foreground }]}>
                      {fmtMoney(p)}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              <AppText
                style={[
                  styles.fieldLabel,
                  { color: colors.mutedForeground, marginTop: 18, textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {t("wallet.methodLabel")}
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
                          backgroundColor: active ? colors.primary + "14" : colors.card,
                          borderColor: active ? colors.primary : colors.border,
                          borderRadius: colors.radius,
                          flexDirection: rowDir,
                        },
                      ]}
                      testID={`wallet-method-${m.key}`}
                    >
                      <Ionicons
                        name={m.icon}
                        size={18}
                        color={active ? colors.primary : colors.mutedForeground}
                      />
                      <AppText
                        style={[styles.methodText, { color: active ? colors.primary : colors.foreground }]}
                      >
                        {t(`wallet.methods.${m.key}`)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              {amountError ? (
                <AppText style={[styles.errorText, { color: colors.destructive }]}>
                  {t("wallet.enterAmount")}
                </AppText>
              ) : null}
              {payState === "error" ? (
                <AppText style={[styles.errorText, { color: colors.destructive }]}>
                  {t("wallet.topupFailed")}
                </AppText>
              ) : null}

              <Pressable
                onPress={handleTopup}
                disabled={payState === "processing"}
                style={[
                  styles.payBtn,
                  {
                    backgroundColor: payState === "processing" ? colors.secondary : colors.primary,
                    borderRadius: colors.radius,
                  },
                ]}
                testID="wallet-submit"
              >
                {payState === "processing" ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <AppText style={[styles.payBtnText, { color: colors.primaryForeground }]}>
                    {Number(amount) > 0
                      ? t("wallet.pay", { amount: `${egp} ${fmtMoney(Number(amount))}` })
                      : t("wallet.addFunds")}
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
  balanceCard: { padding: 20, marginBottom: 14 },
  balanceTop: { alignItems: "center", justifyContent: "space-between" },
  balanceLabel: { fontSize: 13, fontWeight: "500", opacity: 0.9 },
  balanceValue: { fontSize: 30, fontWeight: "700", marginTop: 10 },
  balanceHint: { fontSize: 13, marginTop: 4, opacity: 0.9 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginBottom: 20,
  },
  addBtnText: { fontSize: 15, fontWeight: "700" },
  promoCard: { padding: 16, marginBottom: 20, borderWidth: StyleSheet.hairlineWidth },
  promoHead: { alignItems: "center", gap: 8 },
  promoTitle: { fontSize: 14, fontWeight: "700" },
  promoValue: { fontSize: 20, fontWeight: "700", marginTop: 8 },
  promoMeta: { fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  sectionHead: { marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  emptyCard: { padding: 32, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: "600" },
  emptyText: { fontSize: 13, textAlign: "center" },
  txCard: { paddingHorizontal: 16, paddingVertical: 4 },
  txRow: { alignItems: "center", gap: 12, paddingVertical: 14 },
  txIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  txBody: { flex: 1, gap: 2 },
  txLabel: { fontSize: 14, fontWeight: "600" },
  txDate: { fontSize: 12 },
  txAmount: { fontSize: 14, fontWeight: "700" },
  moreBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  moreText: { fontSize: 14, fontWeight: "600" },
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
  fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: 10 },
  amountInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "700",
  },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  presetChip: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  presetText: { fontSize: 14, fontWeight: "600" },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  methodChip: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  methodText: { fontSize: 14, fontWeight: "500" },
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
