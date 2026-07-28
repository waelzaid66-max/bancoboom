import { Feather, Ionicons, MaterialCommunityIcons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { FeedItem, sendBehaviorSignal } from "@workspace/api-client-react";

import { AppText } from "@/components/AppText";
import { BReactionButton } from "@/components/BReactionButton";
import { SectionBackdrop } from "@/components/SectionBackdrop";
import { isVerifiedSignal } from "@/constants/feed";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useColors } from "@/hooks/useColors";
import { sectionAccent } from "@/lib/sectionTheme";
import { shareListing } from "@/lib/share";

/**
 * Stays identity — Booking & Stays IS the Real-Estate world (residential rent /
 * furnished), so it wears real-estate's section accent, not a foreign blue.
 * Every section is "its own company" via sectionTheme; stays borrows real_estate
 * so the section reads as one coherent space with the rest of the app.
 */
export const STAYS_ACCENT = sectionAccent("real_estate");

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/** The save glyph speaks the section's language — a key for residences (real
 *  estate), falling back to the heart. Filled + accent = saved, everywhere. */
function saveIconFor(
  category: string | null | undefined,
  saved: boolean | undefined,
): IoniconName {
  const pair =
    category === "real_estate"
      ? { on: "key" as IoniconName, off: "key-outline" as IoniconName }
      : { on: "heart" as IoniconName, off: "heart-outline" as IoniconName };
  return saved ? pair.on : pair.off;
}

interface StayCardProps {
  item: FeedItem;
  onPress?: (item: FeedItem) => void;
  onSave?: (item: FeedItem) => void;
  isSaved?: boolean;
}

/**
 * A Booking.com-style stay card. The whole card leads with the unit's real
 * photo (a section-indicating background, exactly like the Discover section
 * cards) under a bottom scrim that carries the title + location in white. A
 * "bookable now" ribbon marks furnished/daily units. The price is the honest
 * per-term string straight from the BFF ("/يوم" etc. already baked in — never
 * any client-side math). The B reaction is wired identically to SmartAssetCard:
 * tap = save (reaches the owner), long-press = interested / not-for-me signals
 * that personalise the adaptive feed. No feature is dropped versus the feed card.
 */
function StayCardComponent({ item, onPress, onSave, isSaved }: StayCardProps) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { cacheFeedItem, sessionId } = useSession();

  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.16);
  const elevation = useSharedValue(4);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
    elevation: elevation.value,
    shadowRadius: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
  }));

  const pressIn = () => {
    if (reduceMotion) return;
    scale.value = withTiming(0.97, { duration: 80 });
    shadowOpacity.value = withTiming(0.06, { duration: 80 });
    elevation.value = withTiming(1, { duration: 80 });
  };
  const pressOut = () => {
    if (reduceMotion) return;
    scale.value = withTiming(1, { duration: 120 });
    shadowOpacity.value = withTiming(0.16, { duration: 120 });
    elevation.value = withTiming(4, { duration: 120 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cacheFeedItem(item);
    onPress?.(item);
  };

  const [potentialFlash, setPotentialFlash] = useState(false);

  // Long-press → "Potential" chip: persist the save (so it reaches the owner)
  // AND record an "interested" affinity signal. A plain tap runs handleSave
  // (save only). Identical contract to the feed card (SmartAssetCard).
  const handlePotential = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPotentialFlash(true);
    onSave?.(item);
    void sendBehaviorSignal({
      session_id: sessionId,
      listing_id: item.id,
      action: "interested",
      category: item.category ?? undefined,
    }).catch(() => {});
    setTimeout(() => setPotentialFlash(false), 1200);
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave?.(item);
  };

  // Long-press reactions: "interested" boosts this category's affinity in the
  // adaptive feed, "angry" lowers it. Fire-and-forget — never touches the UI.
  const sendReaction = (action: "interested" | "angry") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void sendBehaviorSignal({
      session_id: sessionId,
      listing_id: item.id,
      action,
      category: item.category ?? undefined,
    }).catch(() => {});
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void shareListing({ id: item.id, title: item.title, price: item.price_display });
  };

  const bookable = !!item.is_bookable;
  const isVerified = isVerifiedSignal(item.trust_signal);
  const hasPhoto = !!item.media_preview;
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";

  return (
    <Animated.View style={[styles.outer, { borderRadius: colors.radius }, animatedStyle]}>
      <View
        style={[
          styles.inner,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        <Pressable
          onPressIn={pressIn}
          onPressOut={pressOut}
          onPress={handlePress}
          testID={`stay-card-${item.id}`}
        >
          {/* ── Photo-forward hero: the unit photo IS the section background ── */}
          <View style={styles.imageWrap}>
            <SectionBackdrop section="real_estate" motifSize={54} />
            {hasPhoto ? (
              <Image
                source={{ uri: item.media_preview }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
            ) : null}

            {/* Bottom scrim so the white title/location always read */}
            <LinearGradient
              colors={["rgba(10,6,8,0)", "rgba(10,6,8,0.28)", "rgba(10,6,8,0.9)"]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.scrim}
            />

            {/* Top-start: bookable ribbon + sponsored (logical start/end — not
                physical left/right — so RTL mirrors correctly; Claude/Cursor
                coverActions lesson). */}
            <View style={styles.topBadges}>
              {bookable ? (
                <View style={[styles.bookablePill, { backgroundColor: STAYS_ACCENT }]}>
                  <Ionicons name="calendar" size={12} color="#FFFFFF" />
                  <AppText style={styles.bookableText}>
                    {t("search.discover.section.staysBookable")}
                  </AppText>
                </View>
              ) : null}
              {item.is_sponsored ? (
                <View style={styles.sponsoredBadge}>
                  <AppText style={styles.sponsoredText}>{t("common.featured")}</AppText>
                </View>
              ) : null}
            </View>

            {/* Top-end: share + the identity B reaction (fully wired) */}
            <View style={styles.topActions}>
              <Pressable style={styles.actionBtn} onPress={handleShare} hitSlop={8}>
                <Ionicons name="share-social-outline" size={19} color="#FFFFFF" />
              </Pressable>
              {onSave ? (
                <View style={styles.actionBtn}>
                  {/* Mirrors SmartAssetCard's BReactionButton contract exactly:
                      tap = like/save, long-press menu = Potential + not-for-me. */}
                  <BReactionButton
                    saved={!!isSaved}
                    likeIcon={saveIconFor(item.category, true)}
                    onLike={handleSave}
                    onInterested={handlePotential}
                    onAngry={() => sendReaction("angry")}
                    height={26}
                    testID={`stay-save-${item.id}`}
                  />
                </View>
              ) : null}
            </View>

            {/* Bottom overlay on the scrim: section chip + title + location */}
            <View style={styles.heroOverlay} pointerEvents="none">
              <View style={[styles.sectionChip, { flexDirection: rowDir }]}>
                <Ionicons name="bed-outline" size={12} color="#FFFFFF" />
                <AppText style={styles.sectionChipText}>
                  {t("home.categories.booking")}
                </AppText>
              </View>
              <AppText style={[styles.title, { textAlign }]} numberOfLines={2}>
                {item.title}
              </AppText>
              <View style={[styles.locationRow, { flexDirection: rowDir }]}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.9)" />
                <AppText style={[styles.location, { textAlign }]} numberOfLines={1}>
                  {item.location}
                </AppText>
              </View>
            </View>
          </View>

          {/* ── Compact info strip: trust + honest price + reserve affordance ── */}
          <View style={styles.content}>
            <View style={[styles.trustRow, { flexDirection: rowDir }]}>
              {isVerified ? (
                <MaterialCommunityIcons name="check-decagram" size={13} color={STAYS_ACCENT} />
              ) : null}
              <AppText
                style={[
                  styles.trust,
                  { color: isVerified ? STAYS_ACCENT : colors.mutedForeground },
                ]}
                numberOfLines={1}
              >
                {item.trust_signal}
              </AppText>
            </View>

            <View style={[styles.priceRow, { flexDirection: rowDir }]}>
              <AppText
                style={[styles.price, { color: colors.foreground, textAlign }]}
                numberOfLines={1}
              >
                {item.price_display}
              </AppText>
              {bookable ? (
                <View style={[styles.reserveHint, { flexDirection: rowDir }]}>
                  <AppText style={[styles.reserveText, { color: STAYS_ACCENT }]}>
                    {t("booking.reserve")}
                  </AppText>
                  <Feather
                    name={isRTL ? "chevron-left" : "chevron-right"}
                    size={15}
                    color={STAYS_ACCENT}
                  />
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export const StayCard = React.memo(
  StayCardComponent,
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.isSaved === next.isSaved &&
    prev.onPress === next.onPress &&
    prev.onSave === next.onSave,
);

const styles = StyleSheet.create({
  outer: { marginBottom: 14 },
  inner: { borderWidth: 1, overflow: "hidden" },
  imageWrap: { position: "relative", width: "100%", height: 208 },
  scrim: { ...StyleSheet.absoluteFillObject },
  topBadges: {
    position: "absolute",
    top: 10,
    // Logical edge — mirrors in RTL (physical left/right do not).
    start: 10,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  bookablePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  bookableText: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sponsoredBadge: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sponsoredText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  topActions: {
    position: "absolute",
    top: 10,
    end: 10,
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: { backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 20, padding: 6 },
  heroOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 11,
    gap: 5,
  },
  sectionChip: {
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.42)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 1,
  },
  sectionChipText: { color: "#FFFFFF", fontSize: 10.5, fontFamily: "Inter_600SemiBold" },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    lineHeight: 21,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  locationRow: { alignItems: "center", gap: 4 },
  location: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.92)",
    flex: 1,
  },
  content: { padding: 13, gap: 6 },
  trustRow: { alignItems: "center", gap: 4 },
  trust: { fontSize: 11.5, fontFamily: "Inter_400Regular" },
  priceRow: { alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 20, fontFamily: "Inter_700Bold", flexShrink: 1 },
  reserveHint: { alignItems: "center", gap: 2 },
  reserveText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
