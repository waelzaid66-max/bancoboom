import { Feather, MaterialCommunityIcons } from "@/components/icons";
import {
  CompanyDirectoryItem,
  useListCompanies,
} from "@workspace/api-client-react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

type Colors = ReturnType<typeof useColors>;
type T = (k: string, vars?: Record<string, string | number>) => string;

// NOTE: with React Compiler enabled, a component referenced in JSX must be
// defined textually BEFORE the component that renders it — the compiler rewrites
// function declarations into const bindings, so normal hoisting no longer
// applies and a later definition throws a runtime ReferenceError (invisible to
// tsc/Metro). CompanyCard therefore stays above CompanyOffers.
function CompanyCard({
  item,
  colors,
  t,
  rowDir,
  textAlign,
}: {
  item: CompanyDirectoryItem;
  colors: Colors;
  t: T;
  rowDir: "row" | "row-reverse";
  textAlign: "left" | "right";
}) {
  const lead = textAlign === "right" ? "right" : "left";
  const meta = [
    item.industry ? t(`business.ind.${item.industry}`) : null,
    item.hq_country || null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Pressable
      onPress={() => router.push(`/business/company/${item.id}`)}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
      testID={`company-offer-${item.id}`}
    >
      <View style={styles.cover}>
        {item.cover_url ? (
          <Image
            source={{ uri: item.cover_url }}
            style={styles.coverImg}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <LinearGradient
            colors={["#7A0C12", "#1C0507"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coverImg}
          />
        )}
        <View
          style={[
            styles.logo,
            { [lead]: 10, backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {item.logo_url ? (
            <Image
              source={{ uri: item.logo_url }}
              style={styles.logoImg}
              contentFit="cover"
            />
          ) : (
            <MaterialCommunityIcons
              name="office-building-outline"
              size={20}
              color={colors.mutedForeground}
            />
          )}
        </View>
      </View>

      <View style={styles.body}>
        <View style={[styles.nameRow, { flexDirection: rowDir }]}>
          <AppText
            numberOfLines={1}
            style={[styles.name, { color: colors.foreground, textAlign }]}
          >
            {item.name}
          </AppText>
          {item.is_verified && (
            <MaterialCommunityIcons
              name="check-decagram"
              size={14}
              color={colors.primary}
            />
          )}
        </View>
        {meta ? (
          <AppText
            numberOfLines={1}
            style={[styles.meta, { color: colors.mutedForeground, textAlign }]}
          >
            {meta}
          </AppText>
        ) : null}
        <View
          style={[
            styles.countPill,
            {
              backgroundColor: colors.secondary,
              flexDirection: rowDir,
              alignSelf: lead === "right" ? "flex-end" : "flex-start",
            },
          ]}
        >
          <Feather name="grid" size={11} color={colors.primary} />
          <AppText style={[styles.countText, { color: colors.foreground }]}>
            {`${item.active_listings} ${t("search.discover.activeListings")}`}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Featured companies & developers rail for the Search discover surface. Every
 * card is a real, verified company that has at least one live listing (filtered
 * client-side on `active_listings`), so the section is honest: it renders nothing
 * at all when there is no verified company with inventory — never an empty state
 * or a forever-skeleton. Tapping a card opens that company's public profile.
 */
export function CompanyOffers() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign: "left" | "right" = isRTL ? "right" : "left";

  const { data, isLoading } = useListCompanies({ verified: true });
  const companies = (data?.data ?? [])
    .filter((c) => c.active_listings > 0)
    .slice(0, 8);

  if (isLoading || companies.length === 0) return null;

  return (
    <View>
      <View style={[styles.head, { flexDirection: rowDir }]}>
        <View style={styles.headText}>
          <AppText
            style={[styles.title, { color: colors.foreground, textAlign }]}
          >
            {t("search.discover.companyOffers")}
          </AppText>
          <AppText
            numberOfLines={1}
            style={[styles.sub, { color: colors.mutedForeground, textAlign }]}
          >
            {t("search.discover.companyOffersSub")}
          </AppText>
        </View>
        <Pressable
          onPress={() => router.push("/business/suppliers")}
          hitSlop={10}
          testID="company-offers-see-all"
        >
          <AppText style={[styles.seeAll, { color: colors.primary }]}>
            {t("search.discover.seeAll")}
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { flexDirection: rowDir }]}
      >
        {companies.map((c) => (
          <CompanyCard
            key={c.id}
            item={c}
            colors={colors}
            t={t}
            rowDir={rowDir}
            textAlign={textAlign}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 12,
    gap: 12,
  },
  headText: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12.5, fontFamily: "Inter_400Regular" },
  seeAll: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  row: { gap: 12, paddingHorizontal: 16 },
  card: { width: 224, borderWidth: 1, overflow: "hidden" },
  cover: { height: 88, width: "100%" },
  coverImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  logo: {
    position: "absolute",
    bottom: 10,
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: { width: "100%", height: "100%" },
  body: { padding: 12, gap: 6 },
  nameRow: { alignItems: "center", gap: 6 },
  name: { flexShrink: 1, fontSize: 14.5, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  countPill: {
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  countText: { fontSize: 11.5, fontFamily: "Inter_600SemiBold" },
});
