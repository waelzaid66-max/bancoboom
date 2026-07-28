// Additive supply-chain cross-links rendered on listing detail (Task #33
// contract). Groups linked_listings into required inputs, compatible
// machines, and other related links. Pure presentational — every string is
// already pre-formatted by the BFF. Does NOT touch payment/finance UI.
import { MaterialCommunityIcons } from "@/components/icons";
import { Image } from "expo-image";
import React from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { LinkedListing } from "@workspace/api-client-react";
import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  items: LinkedListing[] | undefined;
  onPress: (id: string) => void;
}

type Group = { key: string; titleKey: string; items: LinkedListing[] };

function groupLinks(items: LinkedListing[]): Group[] {
  const required = items.filter(
    (i) => i.relation === "feeds_into" && i.direction === "incoming",
  );
  const compatible = items.filter((i) => i.relation === "compatible_with");
  const rest = items.filter(
    (i) => !required.includes(i) && !compatible.includes(i),
  );
  return [
    { key: "required", titleKey: "listing.linkedRequired", items: required },
    {
      key: "compatible",
      titleKey: "listing.linkedCompatible",
      items: compatible,
    },
    { key: "related", titleKey: "listing.linkedRelated", items: rest },
  ].filter((g) => g.items.length > 0);
}

function relationLabelKey(relation: string): string {
  switch (relation) {
    case "feeds_into":
      return "listing.relFeedsInto";
    case "part_of":
      return "listing.relPartOf";
    case "compatible_with":
      return "listing.relCompatible";
    default:
      return "listing.relCompatible";
  }
}

export function LinkedListings({ items, onPress }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const textAlign = isRTL ? "right" : "left";
  const rowDir = isRTL ? "row-reverse" : "row";

  if (!items || items.length === 0) return null;
  const groups = groupLinks(items);
  if (groups.length === 0) return null;

  return (
    <View style={[styles.section, { borderTopColor: colors.border }]}>
      <AppText
        style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}
      >
        {t("listing.linkedTitle")}
      </AppText>

      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <AppText
            style={[
              styles.groupTitle,
              { color: colors.mutedForeground, textAlign },
            ]}
          >
            {t(group.titleKey)}
          </AppText>
          <FlatList
            data={isRTL ? [...group.items].reverse() : group.items}
            keyExtractor={(i) => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.row,
              isRTL && { flexDirection: "row-reverse" },
            ]}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onPress(item.id)}
                style={[
                  styles.cardItem,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
                testID={`linked-listing-${item.id}`}
              >
                {item.thumbnail ? (
                  <Image
                    source={{ uri: item.thumbnail }}
                    style={[
                      styles.thumb,
                      {
                        borderTopLeftRadius: colors.radius,
                        borderTopRightRadius: colors.radius,
                      },
                    ]}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View
                    style={[
                      styles.thumb,
                      styles.thumbFallback,
                      {
                        backgroundColor: colors.secondary,
                        borderTopLeftRadius: colors.radius,
                        borderTopRightRadius: colors.radius,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="cog-outline"
                      size={28}
                      color={colors.mutedForeground}
                    />
                  </View>
                )}

                <View style={styles.cardBody}>
                  <View
                    style={[
                      styles.relBadge,
                      {
                        backgroundColor: colors.primary + "1A",
                        alignSelf: isRTL ? "flex-end" : "flex-start",
                      },
                    ]}
                  >
                    <AppText style={[styles.relText, { color: colors.primary }]}>
                      {t(relationLabelKey(item.relation))}
                    </AppText>
                  </View>
                  <AppText
                    style={[
                      styles.cardTitle,
                      { color: colors.foreground, textAlign },
                    ]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </AppText>
                  <AppText
                    style={[
                      styles.cardPrice,
                      { color: colors.foreground, textAlign },
                    ]}
                    numberOfLines={1}
                  >
                    {item.price_display}
                  </AppText>
                  {item.supplier && (
                    <View style={[styles.supplierRow, { flexDirection: rowDir }]}>
                      {item.supplier.is_verified && (
                        <MaterialCommunityIcons
                          name="check-decagram"
                          size={12}
                          color={colors.primary}
                        />
                      )}
                      <AppText
                        style={[
                          styles.supplierText,
                          { color: colors.mutedForeground },
                        ]}
                        numberOfLines={1}
                      >
                        {item.supplier.name}
                      </AppText>
                    </View>
                  )}
                </View>
              </Pressable>
            )}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderTopWidth: 1,
    paddingTop: 20,
    paddingBottom: 4,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  group: { marginBottom: 16 },
  groupTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: { paddingHorizontal: 12, gap: 10 },
  cardItem: {
    width: 160,
    borderWidth: 1,
    overflow: "hidden",
  },
  thumb: { width: "100%", height: 96 },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 10, gap: 4 },
  relBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  relText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  cardTitle: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  cardPrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
  supplierRow: { alignItems: "center", gap: 3, marginTop: 2 },
  supplierText: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 1 },
});
