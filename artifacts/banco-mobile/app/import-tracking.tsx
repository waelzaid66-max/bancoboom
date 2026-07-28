// Import lifecycle guide — visual stages of the car import journey + entry points.
// No backend state needed: shows the process visually and links to RFQs.
import { Feather } from "@/components/icons";
import { router } from "expo-router";
import React from "react";
import {
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
import { useUser } from "@clerk/expo";
import {
  useListMyImportOrders,
  getListMyImportOrdersQueryKey,
} from "@workspace/api-client-react";

const STAGES: {
  key: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  color: string;
}[] = [
  { key: "stageOrder",    icon: "file-text",   color: "#E53935" },
  { key: "stageReview",   icon: "clock",        color: "#F97316" },
  { key: "stageConfirm",  icon: "check-circle", color: "#F59E0B" },
  { key: "stageShipping", icon: "truck",        color: "#0EA5E9" },
  { key: "stageCustoms",  icon: "shield",       color: "#8B5CF6" },
  { key: "stageDelivered",icon: "package",      color: "#22C55E" },
];

// DB stage value → STAGES index (cancelled is handled separately).
const STAGE_INDEX: Record<string, number> = {
  order: 0,
  review: 1,
  confirm: 2,
  shipping: 3,
  customs: 4,
  delivered: 5,
};

const HOW_STEPS: {
  key: string;
  icon: React.ComponentProps<typeof Feather>["name"];
}[] = [
  { key: "step1", icon: "search" },
  { key: "step2", icon: "phone" },
  { key: "step3", icon: "truck" },
  { key: "step4", icon: "key" },
];

export default function ImportTrackingScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const { user } = useUser();
  const ordersQuery = useListMyImportOrders({
    query: {
      queryKey: getListMyImportOrdersQueryKey(),
      enabled: !!user,
      staleTime: 30_000,
    },
  });
  const orders = ordersQuery.data?.data ?? [];
  // A signed-in buyer whose orders fail to load must NOT silently fall through
  // to the educational guide — that reads as "my order vanished". Same contract
  // the Banks inbox uses: surface the failure with a retry.
  const showOrdersError = !!user && ordersQuery.isError;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 10,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
            flexDirection: rowDir,
          },
        ]}
        testID="import-track-header"
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.iconBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather
            name={isRTL ? "arrow-right" : "arrow-left"}
            size={22}
            color={colors.foreground}
          />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("importTrack.title")}
        </AppText>
        {/* Spacer to keep title centred */}
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle */}
        <AppText
          style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}
        >
          {t("importTrack.subtitle")}
        </AppText>

        {/* Request a car import */}
        <Pressable
          onPress={() => router.push("/import/request" as any)}
          style={styles.requestCta}
          testID="import-request-cta"
        >
          <Feather name="plus-circle" size={18} color="#FFFFFF" />
          <AppText style={styles.requestCtaText}>
            {t("importTrack.requestCta")}
          </AppText>
        </Pressable>

        {/* Orders failed to load — never fall through to the guide silently. */}
        {showOrdersError && (
          <View
            style={[
              styles.orderCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                flexDirection: rowDir,
              },
            ]}
            testID="import-orders-error"
          >
            <View style={[styles.orderDot, { backgroundColor: "#9CA3AF" }]}>
              <Feather name="alert-triangle" size={14} color="#FFFFFF" />
            </View>
            <View style={styles.orderBody}>
              <AppText
                style={[styles.orderTitle, { color: colors.foreground, textAlign }]}
              >
                {t("common.error")}
              </AppText>
            </View>
            <Pressable
              onPress={() => ordersQuery.refetch()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("common.retry")}
              testID="import-orders-retry"
            >
              <AppText style={[styles.orderStage, { color: colors.primary }]}>
                {t("common.retry")}
              </AppText>
            </Pressable>
          </View>
        )}

        {/* My import orders (live stages) */}
        {orders.length > 0 && (
          <View style={styles.ordersWrap}>
            <AppText
              style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}
            >
              {t("importTrack.myOrdersTitle")}
            </AppText>
            {orders.map((o) => {
              const cancelled = o.stage === "cancelled";
              const si = STAGE_INDEX[o.stage];
              const st = si != null ? STAGES[si] : null;
              const dotColor = cancelled ? "#9CA3AF" : st?.color ?? "#9CA3AF";
              const label = cancelled
                ? t("importTrack.stageCancelled")
                : st
                  ? t(`importTrack.${st.key}` as any)
                  : o.stage;
              const title =
                o.listing_title ?? o.origin_country ?? t("importTrack.reqVehicle");
              return (
                <View
                  key={o.id}
                  style={[
                    styles.orderCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      flexDirection: rowDir,
                    },
                  ]}
                  testID={`import-order-${o.id}`}
                >
                  <View style={[styles.orderDot, { backgroundColor: dotColor }]}>
                    <Feather
                      name={cancelled ? "x" : st?.icon ?? "package"}
                      size={14}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.orderBody}>
                    <AppText
                      numberOfLines={1}
                      style={[styles.orderTitle, { color: colors.foreground, textAlign }]}
                    >
                      {title}
                    </AppText>
                    <AppText style={[styles.orderStage, { color: dotColor, textAlign }]}>
                      {label}
                      {!cancelled && si != null ? `  ·  ${si + 1}/6` : ""}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Lifecycle Timeline */}
        <View
          style={[
            styles.timelineCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {STAGES.map((stage, idx) => (
            <View
              key={stage.key}
              style={[styles.stageRow, { flexDirection: rowDir }]}
            >
              {/* Track: dot + line */}
              <View style={styles.stageTrack}>
                <View
                  style={[styles.stageDot, { backgroundColor: stage.color }]}
                >
                  <Feather name={stage.icon} size={13} color="#FFFFFF" />
                </View>
                {idx < STAGES.length - 1 && (
                  <View
                    style={[
                      styles.stageLine,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
              </View>
              {/* Label */}
              <View style={styles.stageLabelWrap}>
                <AppText
                  style={[styles.stageLabel, { color: colors.foreground }]}
                >
                  {t(`importTrack.${stage.key}` as any)}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        {/* How it works */}
        <AppText
          style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}
        >
          {t("importTrack.howTitle")}
        </AppText>

        <View
          style={[
            styles.howCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {HOW_STEPS.map((step, idx) => (
            <View
              key={step.key}
              style={[
                styles.howRow,
                {
                  flexDirection: rowDir,
                  borderBottomColor: colors.border,
                  borderBottomWidth:
                    idx < HOW_STEPS.length - 1 ? StyleSheet.hairlineWidth : 0,
                },
              ]}
            >
              <View
                style={[
                  styles.stepNum,
                  { backgroundColor: "rgba(229,57,53,0.12)" },
                ]}
              >
                <AppText style={[styles.stepNumText, { color: "#E53935" }]}>
                  {idx + 1}
                </AppText>
              </View>
              <AppText
                style={[
                  styles.howText,
                  { color: colors.foreground },
                  isRTL ? { marginRight: 12 } : { marginLeft: 12 },
                ]}
              >
                {t(`importTrack.${step.key}` as any)}
              </AppText>
            </View>
          ))}
        </View>

        {/* Primary CTA — browse imported cars */}
        <Pressable
          onPress={() => router.push("/section/car?engine=import" as any)}
          style={styles.primaryCta}
        >
          <Feather name="search" size={18} color="#FFFFFF" />
          <AppText style={styles.primaryCtaText}>
            {t("importTrack.startCta")}
          </AppText>
        </Pressable>

        <AppText
          style={[styles.ctaSub, { color: colors.mutedForeground, textAlign }]}
        >
          {t("importTrack.startCtaSub")}
        </AppText>

        {/* Secondary CTA — view submitted RFQs */}
        <Pressable
          onPress={() => router.push("/rfq")}
          style={[styles.secondaryCta, { borderColor: colors.border }]}
        >
          <Feather name="list" size={16} color={colors.foreground} />
          <AppText
            style={[styles.secondaryCtaText, { color: colors.foreground }]}
          >
            {t("importTrack.viewRfqs")}
          </AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 60,
    gap: 12,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    marginTop: 8,
  },
  timelineCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  stageRow: {
    alignItems: "flex-start",
    paddingVertical: 2,
  },
  stageTrack: {
    alignItems: "center",
    width: 32,
  },
  stageDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  stageLine: {
    width: 2,
    height: 20,
    marginTop: 2,
  },
  stageLabelWrap: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 4,
    paddingHorizontal: 12,
  },
  stageLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  howCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  howRow: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 0,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  howText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
  primaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#E53935",
    marginTop: 12,
  },
  primaryCtaText: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    color: "#FFFFFF",
  },
  ctaSub: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  secondaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  secondaryCtaText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  requestCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#E53935",
    marginBottom: 4,
  },
  requestCtaText: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    color: "#FFFFFF",
  },
  ordersWrap: { gap: 8 },
  orderCard: {
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  orderDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  orderBody: { flex: 1, minWidth: 0 },
  orderTitle: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  orderStage: {
    fontSize: 12.5,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
});
