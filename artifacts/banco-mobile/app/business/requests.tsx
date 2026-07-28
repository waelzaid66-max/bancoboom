import { Feather, MaterialCommunityIcons } from "@/components/icons";
import {
  getDealerLeads,
  updateLeadStatus,
  Lead,
  LeadActionType,
  LeadStatus,
} from "@workspace/api-client-react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

type LoadState = "loading" | "ready" | "error" | "restricted";
type Colors = ReturnType<typeof useColors>;
type T = ReturnType<typeof useI18n>["t"];

function statusTone(status: LeadStatus | undefined, colors: Colors) {
  switch (status) {
    case "new":
      return colors.primary;
    case "contacted":
      return colors.accent;
    case "closed":
      return colors.mutedForeground;
    default:
      return colors.mutedForeground;
  }
}

function actionTone(action: LeadActionType | undefined, colors: Colors) {
  switch (action) {
    case "finance_request":
      return colors.primary;
    case "chat":
      return colors.accent;
    case "call":
      return "#2563EB";
    case "whatsapp":
      return "#25D366";
    default:
      return colors.mutedForeground;
  }
}

function nextStatus(status: LeadStatus | undefined): LeadStatus | null {
  if (status === "new") return "contacted";
  if (status === "contacted") return "closed";
  return null;
}

function relativeTime(iso: string | undefined, t: T): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return t("requests.time.justNow");
  if (mins < 60) return t("requests.time.minutesAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("requests.time.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return t("requests.time.daysAgo", { count: days });
}

export default function BusinessRequestsScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);

  const [state, setState] = useState<LoadState>("loading");
  const [items, setItems] = useState<Lead[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getDealerLeads();
      const sorted = (res.data ?? []).slice().sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      setItems(sorted);
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

  const callBuyer = useCallback((phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${phone}`).catch(() => {});
  }, []);

  const whatsappBuyer = useCallback((phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const digits = phone.replace(/[^\d]/g, "");
    Linking.openURL(`https://wa.me/${digits}`).catch(() => {});
  }, []);

  const advance = useCallback(
    async (item: Lead) => {
      const next = nextStatus(item.status);
      if (!item.id || !next) return;
      const id = item.id;
      try {
        setUpdatingId(id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await updateLeadStatus(id, { status: next });
        setItems((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: next } : l)),
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          t("requests.updateErrorTitle"),
          t("requests.updateErrorBody"),
        );
      } finally {
        setUpdatingId(null);
      }
    },
    [t],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
          testID="requests-back"
        >
          <Feather
            name={isRTL ? "arrow-right" : "arrow-left"}
            size={22}
            color={colors.foreground}
          />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("requests.title")}
        </AppText>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleRefresh();
          }}
          style={styles.backBtn}
          hitSlop={12}
          testID="requests-refresh"
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
              styles.retryBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="requests-become-business"
          >
            <MaterialCommunityIcons
              name="storefront-outline"
              size={16}
              color={colors.primaryForeground}
            />
            <AppText
              style={[styles.retryText, { color: colors.primaryForeground }]}
            >
              {t("profile.becomeBusiness")}
            </AppText>
          </Pressable>
        </View>
      ) : state === "error" ? (
        <View style={styles.stateWrap}>
          <Feather name="wifi-off" size={52} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("requests.errorTitle")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("requests.errorHint")}
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
            testID="requests-retry"
          >
            <Feather
              name="refresh-cw"
              size={16}
              color={colors.primaryForeground}
            />
            <AppText
              style={[styles.retryText, { color: colors.primaryForeground }]}
            >
              {t("common.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.stateWrap}>
          <Feather name="inbox" size={52} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("requests.emptyTitle")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("requests.emptyHint")}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            const sTone = statusTone(item.status, colors);
            const aTone = actionTone(item.action_type, colors);
            const next = nextStatus(item.status);
            const isUpdating = updatingId === item.id;
            const phone = item.buyer_phone ?? "";
            return (
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderRadius: colors.radius },
                ]}
              >
                <View style={[styles.cardTop, isRTL && styles.rowReverse]}>
                  <View style={styles.cardInfo}>
                    <AppText
                      style={[
                        styles.cardTitle,
                        {
                          color: colors.foreground,
                          textAlign: isRTL ? "right" : "left",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.listing_title ?? t("requests.untitledListing")}
                    </AppText>
                    <View
                      style={[
                        styles.actionBadge,
                        { backgroundColor: aTone + "22" },
                        isRTL && styles.rowReverse,
                      ]}
                    >
                      {item.action_type === "whatsapp" ? (
                        <MaterialCommunityIcons
                          name="whatsapp"
                          size={12}
                          color={aTone}
                        />
                      ) : (
                        <Feather
                          name={
                            item.action_type === "finance_request"
                              ? "credit-card"
                              : item.action_type === "chat"
                                ? "message-circle"
                                : "phone"
                          }
                          size={12}
                          color={aTone}
                        />
                      )}
                      <AppText style={[styles.actionBadgeText, { color: aTone }]}>
                        {t(`requests.actionTypes.${item.action_type}`)}
                      </AppText>
                    </View>
                  </View>
                  <View
                    style={[styles.statusPill, { backgroundColor: sTone + "22" }]}
                  >
                    <View
                      style={[styles.statusDot, { backgroundColor: sTone }]}
                    />
                    <AppText style={[styles.statusText, { color: sTone }]}>
                      {t(`requests.status.${item.status}`)}
                    </AppText>
                  </View>
                </View>

                <View style={[styles.buyerRow, isRTL && styles.rowReverse]}>
                  <Feather name="user" size={14} color={colors.mutedForeground} />
                  <AppText
                    style={[styles.buyerName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {item.buyer_name?.trim() || t("requests.anonymousBuyer")}
                  </AppText>
                  <AppText
                    style={[styles.timeText, { color: colors.mutedForeground }]}
                  >
                    {relativeTime(item.created_at, t)}
                  </AppText>
                </View>

                <View style={[styles.buyerRow, isRTL && styles.rowReverse]}>
                  <Feather
                    name="phone"
                    size={14}
                    color={colors.mutedForeground}
                  />
                  <AppText
                    style={[styles.buyerPhone, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {phone || t("requests.noPhone")}
                  </AppText>
                </View>

                <View
                  style={[styles.cardDivider, { backgroundColor: colors.border }]}
                />

                <View style={[styles.cardBottom, isRTL && styles.rowReverse]}>
                  <View style={[styles.actionGroup, isRTL && styles.rowReverse]}>
                    <Pressable
                      onPress={() => callBuyer(phone)}
                      disabled={!phone}
                      style={[
                        styles.actionBtn,
                        {
                          borderColor: colors.border,
                          borderRadius: colors.radius,
                          opacity: phone ? 1 : 0.4,
                        },
                      ]}
                      hitSlop={6}
                      testID={`requests-call-${item.id}`}
                    >
                      <Feather name="phone" size={15} color={colors.foreground} />
                      <AppText
                        style={[styles.actionBtnText, { color: colors.foreground }]}
                      >
                        {t("requests.call")}
                      </AppText>
                    </Pressable>
                    <Pressable
                      onPress={() => whatsappBuyer(phone)}
                      disabled={!phone}
                      style={[
                        styles.actionBtn,
                        {
                          borderColor: colors.border,
                          borderRadius: colors.radius,
                          opacity: phone ? 1 : 0.4,
                        },
                      ]}
                      hitSlop={6}
                      testID={`requests-whatsapp-${item.id}`}
                    >
                      <MaterialCommunityIcons
                        name="whatsapp"
                        size={16}
                        color="#25D366"
                      />
                      <AppText
                        style={[styles.actionBtnText, { color: colors.foreground }]}
                      >
                        {t("requests.whatsapp")}
                      </AppText>
                    </Pressable>
                  </View>

                  {next ? (
                    <Pressable
                      onPress={() => advance(item)}
                      disabled={isUpdating}
                      style={[
                        styles.advanceBtn,
                        {
                          backgroundColor: colors.primary,
                          borderRadius: colors.radius,
                        },
                      ]}
                      hitSlop={6}
                      testID={`requests-advance-${item.id}`}
                    >
                      {isUpdating ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.primaryForeground}
                        />
                      ) : (
                        <>
                          <Feather
                            name="check"
                            size={15}
                            color={colors.primaryForeground}
                          />
                          <AppText
                            style={[
                              styles.advanceBtnText,
                              { color: colors.primaryForeground },
                            ]}
                          >
                            {next === "contacted"
                              ? t("requests.markContacted")
                              : t("requests.markClosed")}
                          </AppText>
                        </>
                      )}
                    </Pressable>
                  ) : (
                    <View style={[styles.doneTag, isRTL && styles.rowReverse]}>
                      <Feather
                        name="check-circle"
                        size={15}
                        color={colors.mutedForeground}
                      />
                      <AppText
                        style={[
                          styles.doneTagText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {t("requests.status.closed")}
                      </AppText>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  rowReverse: { flexDirection: "row-reverse" },
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
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  retryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 },
  card: { padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardInfo: { flex: 1, gap: 6 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  actionBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  actionBadgeText: { fontSize: 11.5, fontFamily: "Inter_600SemiBold" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11.5, fontFamily: "Inter_600SemiBold" },
  buyerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  buyerName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  buyerPhone: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  timeText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardDivider: { height: 1, marginVertical: 12 },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  actionGroup: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  advanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 96,
    justifyContent: "center",
  },
  advanceBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  doneTag: { flexDirection: "row", alignItems: "center", gap: 6 },
  doneTagText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
