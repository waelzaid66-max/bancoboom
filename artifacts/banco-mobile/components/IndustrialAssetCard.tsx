// Specs-first industrial card: leads with the text block (title, price,
// location, trust) and de-emphasises the image into a side thumbnail. Built
// for the Industry Hub where buyers scan attributes before photos.
import { Ionicons, MaterialCommunityIcons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { FeedItem } from "@workspace/api-client-react";
import { AppText } from "@/components/AppText";
import { SectionBackdrop } from "@/components/SectionBackdrop";
import { isVerifiedSignal } from "@/constants/feed";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  item: FeedItem;
  onPress: (item: FeedItem) => void;
}

function IndustrialAssetCardComponent({ item, onPress }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { cacheFeedItem } = useSession();
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const isVerified = isVerifiedSignal(item.trust_signal);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Seed cache-first lookup from this list item before navigating.
        cacheFeedItem(item);
        onPress(item);
      }}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          flexDirection: rowDir,
        },
      ]}
      testID={`industrial-card-${item.id}`}
    >
      <View style={styles.info}>
        <AppText
          style={[styles.title, { color: colors.foreground, textAlign }]}
          numberOfLines={2}
        >
          {item.title}
        </AppText>
        <AppText
          style={[styles.price, { color: colors.foreground, textAlign }]}
          numberOfLines={1}
        >
          {item.price_display}
        </AppText>

        {item.installment_badge ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: colors.primary + "14",
                borderColor: colors.primary + "33",
                alignSelf: isRTL ? "flex-end" : "flex-start",
                flexDirection: rowDir,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={12}
              color={colors.primary}
            />
            <AppText
              style={[styles.badgeText, { color: colors.primary }]}
              numberOfLines={1}
            >
              {item.installment_badge}
            </AppText>
          </View>
        ) : null}

        {/* Imported — the B2B / supply signal at a glance. */}
        {item.origin_type === "imported" ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: colors.primary + "14",
                borderColor: colors.primary + "33",
                alignSelf: isRTL ? "flex-end" : "flex-start",
                flexDirection: rowDir,
              },
            ]}
          >
            <MaterialCommunityIcons name="earth" size={12} color={colors.primary} />
            <AppText
              style={[styles.badgeText, { color: colors.primary }]}
              numberOfLines={1}
            >
              {t("home.engines.import")}
            </AppText>
          </View>
        ) : null}

        <View style={[styles.metaRow, { flexDirection: rowDir }]}>
          <Ionicons
            name="location-outline"
            size={12}
            color={colors.mutedForeground}
          />
          <AppText
            style={[styles.location, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {item.location}
          </AppText>
        </View>

        <View style={[styles.metaRow, { flexDirection: rowDir }]}>
          {isVerified && (
            <MaterialCommunityIcons
              name="check-decagram"
              size={13}
              color={colors.primary}
            />
          )}
          <AppText
            style={[
              styles.trust,
              { color: isVerified ? colors.primary : colors.mutedForeground },
            ]}
            numberOfLines={1}
          >
            {item.trust_signal}
          </AppText>
        </View>
      </View>

      <View style={styles.thumbWrap}>
        {/* M2 — section-identity fallback under the thumb (never a grey box). */}
        <SectionBackdrop
          section={item.category}
          motifSize={30}
          style={{ borderRadius: colors.radius - 2, overflow: "hidden" }}
        />
        <Image
          source={{ uri: item.media_preview }}
          style={[styles.thumb, { borderRadius: colors.radius - 2 }]}
          contentFit="cover"
          transition={150}
        />
        {item.is_sponsored && (
          <View style={styles.adBadge}>
            <AppText style={styles.adText}>{t("common.ad")}</AppText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export const IndustrialAssetCard = React.memo(
  IndustrialAssetCardComponent,
  (p, n) => p.item.id === n.item.id && p.onPress === n.onPress,
);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    alignItems: "center",
  },
  info: { flex: 1, gap: 4 },
  title: { fontSize: 14.5, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  price: { fontSize: 19, fontFamily: "Inter_700Bold" },
  badge: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 2,
  },
  badgeText: { fontSize: 11.5, fontFamily: "Inter_600SemiBold" },
  metaRow: { alignItems: "center", gap: 4 },
  location: { fontSize: 12.5, fontFamily: "Inter_400Regular", flexShrink: 1 },
  trust: { fontSize: 11.5, fontFamily: "Inter_400Regular", flexShrink: 1 },
  thumbWrap: { width: 96, height: 96 },
  thumb: { width: 96, height: 96 },
  adBadge: {
    position: "absolute",
    top: 6,
    // Logical start — mirrors in RTL.
    start: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
});
