import { useUser } from "@clerk/expo";
import { Feather, MaterialCommunityIcons } from "@/components/icons";
import { getGetMeQueryKey, useGetMe } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
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

type Status = "verified" | "review" | "none";

export default function VerificationScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { user, isLoaded, isSignedIn } = useUser();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 12 : insets.top;
  const rowDir: "row" | "row-reverse" = isRTL ? "row-reverse" : "row";

  const meQuery = useGetMe({
    query: { queryKey: getGetMeQueryKey(), enabled: !!user },
  });

  const Header = (
    <View
      style={[
        styles.header,
        {
          paddingTop: topPad + 8,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
          flexDirection: rowDir,
        },
      ]}
    >
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"))}
        hitSlop={12}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
        testID="verification-back"
      >
        <Feather
          name={isRTL ? "chevron-right" : "chevron-left"}
          size={26}
          color={colors.foreground}
        />
      </Pressable>
      <AppText style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
        {t("business.vTitle")}
      </AppText>
      <View style={styles.backBtn} />
    </View>
  );

  if (!isLoaded) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Header}
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Header}
        <View style={styles.center}>
          <Feather name="lock" size={52} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("business.signInRequired")}
          </AppText>
          <AppText style={[styles.stateBody, { color: colors.mutedForeground }]}>
            {t("business.signInBody")}
          </AppText>
          <Pressable
            onPress={() => router.replace("/(tabs)/profile")}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            testID="verification-go-signin"
          >
            <AppText style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
              {t("business.goToSignIn")}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  // The authoritative is_verified flag comes from /me. Until it resolves, do not
  // guess a status (a verified business must never flash "under review").
  if (meQuery.isLoading && !meQuery.data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Header}
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (meQuery.isError && !meQuery.data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Header}
        <View style={styles.center}>
          <Feather name="wifi-off" size={48} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("common.error")}
          </AppText>
          <Pressable
            onPress={() => meQuery.refetch()}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            testID="verification-retry"
          >
            <AppText style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
              {t("common.retry")}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  // /me.role is authoritative (DB). Clerk metadata is fallback only.
  const meRole = meQuery.data?.data?.role ?? "";
  const clerkRole = (user.publicMetadata?.role as string) || "";
  const role = meRole || clerkRole;
  const isFi = role === "financial_institution";
  // Ads-first: FI is a business account for trust badge — not a dealer storefront unlock.
  const isBusiness = ["dealer", "company", "enterprise", "financial_institution"].includes(role);
  const isVerified = !!meQuery.data?.data?.is_verified;
  const isUnderReview = isBusiness && !isVerified;
  const status: Status = isVerified ? "verified" : isUnderReview ? "review" : "none";

  // Only client-available, real identity fields. business name + activity live in
  // Clerk unsafeMetadata; phone comes from /me. City and document URLs are NOT
  // returned by the API, so they are intentionally never shown (honesty rule).
  const meta = (user.unsafeMetadata ?? {}) as Record<string, unknown>;
  const displayTitle = typeof meta.displayTitle === "string" ? meta.displayTitle.trim() : "";
  const categoryLabel = typeof meta.categoryLabel === "string" ? meta.categoryLabel.trim() : "";
  const phone = (meQuery.data?.data?.phone ?? "").trim();

  const details: { key: string; label: string; value: string }[] = [];
  if (displayTitle) details.push({ key: "name", label: t("business.businessName"), value: displayTitle });
  if (categoryLabel) details.push({ key: "activity", label: t("business.vActivity"), value: categoryLabel });
  if (phone) details.push({ key: "phone", label: t("business.phone"), value: phone });

  const hero: Record<Status, {
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    color: string;
    title: string;
    body: string;
  }> = {
    verified: {
      icon: "check-decagram",
      color: colors.primary,
      title: isFi ? t("business.vFiVerifiedTitle") : t("business.vVerifiedTitle"),
      body: isFi ? t("business.vFiVerifiedBody") : t("business.vVerifiedBody"),
    },
    review: {
      icon: "clock-outline",
      color: colors.foreground,
      title: isFi ? t("business.vFiReviewTitle") : t("business.vReviewTitle"),
      body: isFi ? t("business.vFiReviewBody") : t("business.vReviewBody"),
    },
    none: {
      icon: "shield-check",
      color: colors.mutedForeground,
      title: isFi ? t("business.vFiNoneTitle") : t("business.vNoneTitle"),
      body: isFi ? t("business.vFiNoneBody") : t("business.vNoneBody"),
    },
  };
  const current = hero[status];
  const ctaLabel =
    status === "none"
      ? isFi
        ? t("business.vFiRegisterCta")
        : t("business.vRegisterCta")
      : t("business.vUpdateCta");

  const goOnboarding = () => {
    Haptics.selectionAsync().catch(() => {});
    // FI must keep intent=fi — never demote into dealer listing onboarding.
    router.push(isFi ? "/business/onboarding?intent=fi" : "/business/onboarding");
  };

  const goBanksHub = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push("/business/banks");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Header}
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <View style={styles.heroWrap}>
          <View style={[styles.heroBadge, { backgroundColor: current.color + "1A" }]}>
            <MaterialCommunityIcons name={current.icon} size={44} color={current.color} />
          </View>
          <AppText style={[styles.heroTitle, { color: colors.foreground }]}>
            {current.title}
          </AppText>
          <AppText style={[styles.heroBody, { color: colors.mutedForeground }]}>
            {current.body}
          </AppText>
        </View>

        {details.length > 0 ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 4 },
            ]}
          >
            <AppText
              style={[styles.cardTitle, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
            >
              {t("business.vDetailsTitle")}
            </AppText>
            {details.map((d, i) => (
              <View
                key={d.key}
                style={[
                  styles.detailRow,
                  {
                    flexDirection: rowDir,
                    borderTopColor: colors.border,
                    borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <AppText style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                  {d.label}
                </AppText>
                <AppText
                  style={[styles.detailValue, { color: colors.foreground, textAlign: isRTL ? "left" : "right" }]}
                  numberOfLines={2}
                >
                  {d.value}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          onPress={goOnboarding}
          style={[styles.primaryBtn, styles.cta, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          testID="verification-cta"
        >
          <Feather
            name={status === "none" ? "shield" : "edit-2"}
            size={18}
            color={colors.primaryForeground}
          />
          <AppText style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
            {ctaLabel}
          </AppText>
        </Pressable>
        {isFi && status === "verified" ? (
          <Pressable
            onPress={goBanksHub}
            style={[
              styles.primaryBtn,
              styles.secondaryCta,
              { borderColor: colors.border, borderRadius: colors.radius },
            ]}
            testID="verification-open-banks"
          >
            <MaterialCommunityIcons name="bank-outline" size={18} color={colors.foreground} />
            <AppText style={[styles.primaryBtnText, { color: colors.foreground }]}>
              {t("business.fiGoBanks")}
            </AppText>
          </Pressable>
        ) : null}
        {status !== "none" ? (
          <AppText
            style={[styles.ctaHint, { color: colors.mutedForeground }]}
          >
            {isFi ? t("business.vFiUpdateHint") : t("business.vUpdateHint")}
          </AppText>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  stateTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  stateBody: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  heroWrap: { alignItems: "center", gap: 12, paddingVertical: 16 },
  heroBadge: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  heroBody: { fontSize: 14, lineHeight: 21, textAlign: "center", paddingHorizontal: 8 },
  card: { borderWidth: StyleSheet.hairlineWidth, padding: 16, marginTop: 20 },
  cardTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  detailRow: { alignItems: "center", justifyContent: "space-between", paddingVertical: 12, gap: 12 },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: "600", flex: 1 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  cta: { marginTop: 24 },
  secondaryCta: {
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
  },
  primaryBtnText: { fontSize: 15, fontWeight: "700" },
  ctaHint: { fontSize: 12.5, textAlign: "center", marginTop: 10, lineHeight: 18 },
});
