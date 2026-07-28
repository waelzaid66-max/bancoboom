import { Feather } from "@/components/icons";
import {
  listInvoices,
  type Invoice,
  type InvoiceTransactionType,
} from "@workspace/api-client-react";
import { router, type Href } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

type LoadState = "loading" | "ready" | "error";

const PAGE = 20;

function fmtMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(iso: string | null | undefined, lang: string): string {
  if (!iso) return "";
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

function txLabelKey(type: InvoiceTransactionType): string {
  if (!type) return "invoices.type.unknown";
  return `wallet.tx.${type}`;
}

export default function InvoicesScreen() {
  const colors = useColors();
  const { t, isRTL, lang } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const egp = t("common.egp");
  const rowDir: "row" | "row-reverse" = isRTL ? "row-reverse" : "row";

  const [state, setState] = useState<LoadState>("loading");
  const [items, setItems] = useState<Invoice[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listInvoices({ limit: PAGE });
      setItems(res.data ?? []);
      setCursor(res.meta?.has_next ? res.meta?.cursor ?? null : null);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listInvoices({ limit: PAGE, cursor });
      setItems((prev) => [...prev, ...(res.data ?? [])]);
      setCursor(res.meta?.has_next ? res.meta?.cursor ?? null : null);
    } catch {
      // keep current page
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

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
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/billing" as Href))}
          style={styles.backBtn}
          hitSlop={12}
          testID="invoices-back"
        >
          <Feather
            name={isRTL ? "arrow-right" : "arrow-left"}
            size={22}
            color={colors.foreground}
          />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("invoices.title")}
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
            {t("invoices.errorTitle")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("invoices.errorBody")}
          </AppText>
          <Pressable
            onPress={() => {
              setState("loading");
              load();
            }}
            style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            testID="invoices-retry"
          >
            <Feather name="refresh-cw" size={16} color={colors.primaryForeground} />
            <AppText style={[styles.retryText, { color: colors.primaryForeground }]}>
              {t("common.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.stateWrap}>
          <Feather name="file-text" size={52} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("invoices.emptyTitle")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("invoices.emptyHint")}
          </AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View
            style={[styles.listCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}
          >
            {items.map((inv, i) => (
              <Pressable
                key={inv.id}
                onPress={() => router.push(`/invoices/${inv.id}` as Href)}
                style={[
                  styles.row,
                  {
                    flexDirection: rowDir,
                    borderTopColor: colors.border,
                    borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
                testID={`invoice-row-${inv.id}`}
              >
                <View style={[styles.rowIcon, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="file-text" size={18} color={colors.primary} />
                </View>
                <View style={styles.rowBody}>
                  <AppText
                    style={[
                      styles.rowTitle,
                      { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                    ]}
                  >
                    {inv.invoice_number}
                  </AppText>
                  <AppText
                    style={[
                      styles.rowMeta,
                      { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                    ]}
                  >
                    {t(txLabelKey(inv.transaction_type))}
                    {inv.issued_at ? ` · ${formatDate(inv.issued_at, lang)}` : ""}
                  </AppText>
                </View>
                <View style={styles.rowEnd}>
                  <AppText style={[styles.rowAmount, { color: colors.foreground }]}>
                    {egp} {fmtMoney(inv.amount)}
                  </AppText>
                  <AppText
                    style={[
                      styles.rowStatus,
                      {
                        color: inv.status === "paid" ? colors.primary : colors.mutedForeground,
                      },
                    ]}
                  >
                    {t(`invoices.status.${inv.status}`)}
                  </AppText>
                </View>
                <Feather
                  name={isRTL ? "chevron-left" : "chevron-right"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            ))}
            {cursor ? (
              <Pressable
                onPress={loadMore}
                disabled={loadingMore}
                style={[styles.moreBtn, { borderTopColor: colors.border }]}
                testID="invoices-load-more"
              >
                {loadingMore ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <AppText style={[styles.moreText, { color: colors.primary }]}>
                    {t("common.loadMore")}
                  </AppText>
                )}
              </Pressable>
            ) : null}
          </View>
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
  listCard: { paddingHorizontal: 16, paddingVertical: 4 },
  row: { alignItems: "center", gap: 12, paddingVertical: 14 },
  rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: "600" },
  rowMeta: { fontSize: 12 },
  rowEnd: { alignItems: "flex-end", gap: 2 },
  rowAmount: { fontSize: 14, fontWeight: "700" },
  rowStatus: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  moreBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  moreText: { fontSize: 14, fontWeight: "600" },
});
