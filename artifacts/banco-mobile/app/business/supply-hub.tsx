// Business & Supply hub — entry surface for the B2B supply-chain & investment
// features (Task #40). Navigation cards + bilingual Google-Play marketplace
// disclaimer footer. Strictly additive; no fabricated numbers anywhere.
import { Feather, MaterialCommunityIcons } from "@/components/icons";
import { router, type Href } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

type Colors = ReturnType<typeof useColors>;

type HubCard = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  titleKey: string;
  descKey: string;
  route: Href;
  testID: string;
};

const CARDS: HubCard[] = [
  {
    icon: "factory",
    titleKey: "business.hub.industryTitle",
    descKey: "business.hub.industryDesc",
    route: "/industry",
    testID: "hub-industry",
  },
  {
    icon: "trending-up",
    titleKey: "business.hub.investmentsTitle",
    descKey: "business.hub.investmentsDesc",
    route: "/business/investments",
    testID: "hub-investments",
  },
  {
    icon: "account-group-outline",
    titleKey: "business.hub.suppliersTitle",
    descKey: "business.hub.suppliersDesc",
    route: "/business/suppliers",
    testID: "hub-suppliers",
  },
  {
    icon: "earth",
    titleKey: "business.hub.globalSupplyTitle",
    descKey: "business.hub.globalSupplyDesc",
    route: "/business/global-supply",
    testID: "hub-global-supply",
  },
  {
    icon: "chart-line",
    titleKey: "business.hub.marketTitle",
    descKey: "business.hub.marketDesc",
    route: "/business/market",
    testID: "hub-market",
  },
  {
    icon: "chart-box-outline",
    titleKey: "business.hub.analyticsTitle",
    descKey: "business.hub.analyticsDesc",
    route: "/business/analytics",
    testID: "hub-analytics",
  },
  {
    icon: "office-building-outline",
    titleKey: "business.hub.companyTitle",
    descKey: "business.hub.companyDesc",
    route: "/business/company/edit",
    testID: "hub-company-edit",
  },
  {
    icon: "clipboard-text-outline",
    titleKey: "business.hub.rfqInboxTitle",
    descKey: "business.hub.rfqInboxDesc",
    route: "/business/rfq-inbox",
    testID: "hub-rfq-inbox",
  },
];

export function MarketplaceDisclaimer({
  colors,
  textAlign,
  rowDir,
}: {
  colors: Colors;
  textAlign: "left" | "right";
  rowDir: "row" | "row-reverse";
}) {
  const { t } = useI18n();
  return (
    <View
      style={[
        styles.disclaimer,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
          flexDirection: rowDir,
        },
      ]}
      testID="marketplace-disclaimer"
    >
      <Feather name="info" size={16} color={colors.mutedForeground} />
      <AppText
        style={[
          styles.disclaimerText,
          { color: colors.mutedForeground, textAlign },
        ]}
      >
        {t("business.disclaimer.marketplace")}
      </AppText>
    </View>
  );
}

export default function SupplyHubScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign: "left" | "right" = isRTL ? "right" : "left";

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
          testID="hub-back"
        >
          <Feather
            name={isRTL ? "arrow-right" : "arrow-left"}
            size={22}
            color={colors.foreground}
          />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("business.hub.title")}
        </AppText>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <AppText
          style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}
        >
          {t("business.hub.subtitle")}
        </AppText>

        {CARDS.map((card) => (
          <Pressable
            key={card.testID}
            onPress={() => router.push(card.route)}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderRadius: colors.radius,
                borderColor: colors.border,
                flexDirection: rowDir,
              },
            ]}
            testID={card.testID}
          >
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: colors.primary + "1A" },
              ]}
            >
              <MaterialCommunityIcons
                name={card.icon}
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.cardBody}>
              <AppText
                style={[styles.cardTitle, { color: colors.foreground, textAlign }]}
              >
                {t(card.titleKey)}
              </AppText>
              <AppText
                style={[
                  styles.cardDesc,
                  { color: colors.mutedForeground, textAlign },
                ]}
              >
                {t(card.descKey)}
              </AppText>
            </View>
            <Feather
              name={isRTL ? "chevron-left" : "chevron-right"}
              size={20}
              color={colors.mutedForeground}
            />
          </Pressable>
        ))}

        <AppText
          style={[styles.footerTitle, { color: colors.foreground, textAlign }]}
        >
          {t("business.hub.footerTitle")}
        </AppText>
        <MarketplaceDisclaimer
          colors={colors}
          textAlign={textAlign}
          rowDir={rowDir}
        />
      </ScrollView>
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
  scroll: { padding: 16, paddingBottom: 120 },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    marginBottom: 8,
  },
  card: {
    alignItems: "center",
    gap: 14,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15.5, fontFamily: "Inter_600SemiBold" },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  footerTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginTop: 28,
    marginBottom: 10,
  },
  disclaimer: {
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderWidth: 1,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
});
