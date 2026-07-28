import { FeedItem } from "@workspace/api-client-react";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Feather } from "@/components/icons";
import { SmartAssetCard } from "@/components/SmartAssetCard";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/LanguageContext";

interface MapOverlayChromeProps {
  /** How many results are actually plotted (the honest mapped count). */
  count: number;
  /** The pin the user tapped, or null when nothing is selected. */
  selected: FeedItem | null;
  onClose: () => void;
  onOpenListing: (item: FeedItem) => void;
  onSave?: (item: FeedItem) => void;
  isSaved: (id: string) => boolean;
}

/**
 * The native-RN chrome drawn on top of the map surface (shared by the WebView
 * and the web <iframe> hosts): a top-left honest "N on the map" caption and,
 * when a pin is tapped, a bottom preview card reusing the same SmartAssetCard
 * as the list so tapping it opens the listing exactly like a list row would.
 */
export function MapOverlayChrome({
  count,
  selected,
  onClose,
  onOpenListing,
  onSave,
  isSaved,
}: MapOverlayChromeProps) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const closeSide = isRTL ? { left: 4 } : { right: 4 };

  return (
    <>
      <View
        style={[
          styles.caption,
          {
            flexDirection: isRTL ? "row-reverse" : "row",
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
          },
        ]}
        pointerEvents="none"
      >
        <Feather name="map-pin" size={13} color={colors.primary} />
        <AppText style={[styles.captionText, { color: colors.foreground }]}>
          {t("search.mappedResults", { count })}
        </AppText>
      </View>

      {selected ? (
        <View style={[styles.cardWrap, { bottom: insets.bottom + 132 }]}>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={[
              styles.close,
              closeSide,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            testID="map-card-close"
          >
            <Feather name="x" size={15} color={colors.foreground} />
          </Pressable>
          <SmartAssetCard
            item={selected}
            onPress={onOpenListing}
            onSave={onSave}
            isSaved={isSaved(selected.id)}
            compact
          />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  caption: {
    position: "absolute",
    top: 12,
    left: 12,
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    elevation: 3,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  captionText: { fontSize: 12, fontWeight: "600" },
  cardWrap: {
    position: "absolute",
    left: 12,
    right: 12,
  },
  close: {
    position: "absolute",
    top: -12,
    zIndex: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});
