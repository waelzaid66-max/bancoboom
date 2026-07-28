import { Feather } from "@/components/icons";
import { FeedItem } from "@workspace/api-client-react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AppText } from "@/components/AppText";
import {
  Category,
  CategoryIcon,
} from "@/components/CategoryTabs";
import { type CarBrand } from "@/constants/cars";
import { useI18n } from "@/context/LanguageContext";
import { SavedSearch } from "@/context/SessionContext";
import { useColors } from "@/hooks/useColors";

// Concrete, browseable sections (no "all" — these are the real catalogues a
// shopper picks between). Each card pushes a dedicated section mini-app —
// never filters the shared Search tab in place (that melt collapsed every
// catalogue into one melted search surface).
const SECTIONS: Category[] = ["car", "real_estate", "facilities", "materials"];

// Dedicated section mini-app routes. Must stay registered in app/_layout.tsx
// as Stack.Screen entries or router.push 404s.
const SECTION_ROUTE: Record<Category, Href> = {
  all: "/section/car",
  car: "/section/car",
  real_estate: "/section/real-estate",
  facilities: "/section/factories",
  materials: "/section/materials",
};

// On-brand gradient pairs per section so each card reads as its own world while
// staying in the BANCO red/charcoal family.
// Red-family fallback fills behind the section photos (identity rule: logo red
// + derivatives only — aligned with lib/sectionTheme's corrected palette).
const SECTION_GRADIENT: Record<Category, [string, string]> = {
  all: ["#7A0C12", "#1C0507"],
  car: ["#8A0E14", "#1C0507"],
  real_estate: ["#7A1226", "#190509"],
  facilities: ["#7E1F14", "#140505"],
  materials: ["#6E1A10", "#160805"],
};

// Real, representative cover photography per browse section, bundled locally so
// the cards read as authentic (trust) and premium. A cinematic scrim sits over
// each photo for legibility and a framed, editorial feel. The gradient above
// stays as the fallback fill behind the photo while it loads.
const SECTION_PHOTO: Partial<Record<Category, number>> = {
  car: require("../assets/images/categories/car.jpg"),
  real_estate: require("../assets/images/categories/real_estate.jpg"),
  facilities: require("../assets/images/categories/facilities.jpg"),
  materials: require("../assets/images/categories/materials.jpg"),
};

// Faint BANCO wordmark embossed behind each card's content — a subtle, premium
// on-brand finish (white-tinted, very low opacity, sits above the scrim but
// below the badge/label/chevron so it never fights legibility).
const BANCO_WATERMARK = require("../assets/images/banco-logo.png");

// 5th portal — Booking & Stays (residential + furnished rental, NOT hotels).
// Wears the real-estate rose identity (blue is reserved for Banks & Financiers)
// and leads with a real photo like the four section cards.
const BOOKING_PHOTO = require("../assets/images/categories/booking.jpg");

interface Props {
  onBrowseBrand: (brand: CarBrand) => void;
  onApplySaved: (s: SavedSearch) => void;
  onOpenListing: (item: FeedItem) => void;
  /**
   * Enter the real-estate section mini-app with map intent (host pushes
   * /section/real-estate?map=1). Must never melt Discover into shared Search.
   */
  onExploreMap: () => void;
  /** Re-run a recent text search (fills the input + commits immediately). */
  onSearchQuery: (q: string) => void;
}

export function SearchDiscover({
  onBrowseBrand: _onBrowseBrand,
  onApplySaved: _onApplySaved,
  onOpenListing: _onOpenListing,
  onExploreMap,
  onSearchQuery: _onSearchQuery,
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";

  const handleSectionPress = (cat: Category) => {
    // ENTER dedicated section mini-app — never show engine strips on Discover
    // and never melt into shared Search criteria (Owner screenshot regression).
    router.push(SECTION_ROUTE[cat]);
  };

  const SectionHeader = ({ label }: { label: string }) => (
    <AppText
      style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}
    >
      {label}
    </AppText>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Image-style section cards */}
      <SectionHeader label={t("search.discover.sections")} />
      <View style={styles.sectionGrid}>
        {SECTIONS.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => handleSectionPress(cat)}
            style={styles.sectionCardWrap}
            accessibilityRole="button"
            accessibilityLabel={t(`home.categories.${cat}`)}
            testID={`section-card-${cat}`}
          >
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: SECTION_GRADIENT[cat][1] },
              ]}
            >
              <Image
                source={SECTION_PHOTO[cat]}
                style={styles.sectionPhoto}
                contentFit="cover"
                transition={220}
              />
              {/* Cinematic scrim: keeps the photo legible and lends a premium,
                  editorial depth (light at the top, deep at the base). */}
              <LinearGradient
                colors={[
                  "rgba(12,4,5,0.10)",
                  "rgba(12,4,5,0.46)",
                  "rgba(12,4,5,0.88)",
                ]}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.sectionScrim}
              />
              <View pointerEvents="none" style={styles.sectionWatermarkWrap}>
                <Image
                  source={BANCO_WATERMARK}
                  style={styles.sectionWatermark}
                  contentFit="contain"
                  tintColor="#FFFFFF"
                />
              </View>
              <View style={styles.sectionBadge}>
                <CategoryIcon category={cat} color="#FFFFFF" />
              </View>
              <View
                style={[
                  styles.sectionLabelRow,
                  isRTL && { flexDirection: "row-reverse" },
                ]}
              >
                <View
                  style={[
                    styles.sectionAccent,
                    { backgroundColor: colors.primary },
                  ]}
                />
                <AppText style={[styles.sectionLabel, { textAlign }]}>
                  {t(`home.categories.${cat}`)}
                </AppText>
              </View>
              <Feather
                name={isRTL ? "chevron-left" : "chevron-right"}
                size={16}
                color="rgba(255,255,255,0.92)"
                style={[
                  styles.sectionChevron,
                  isRTL ? { left: 12 } : { right: 12 },
                ]}
              />
            </View>
          </Pressable>
        ))}
      </View>

      {/* ── 5th portal card — Booking & Stays (إيجار وحجز) ──────────────────
          Residential + furnished rental (NOT hotels). Full-width to read as a
          portal into its own mini-app (/section/booking → BookingStaysApp),
          not a same-tier catalogue section. Real photo + scrim + watermark,
          exactly like the four section cards; rose real-estate identity —
          blue is reserved for Banks & Financiers. */}
      <Pressable
        onPress={() => router.push("/section/booking" as Href)}
        style={styles.bookingCardWrap}
        accessibilityRole="button"
        accessibilityLabel={t("search.discover.bookingHub")}
        testID="section-card-booking"
      >
        <View
          style={[styles.bookingCard, { backgroundColor: SECTION_GRADIENT.real_estate[1] }]}
        >
          <Image
            source={BOOKING_PHOTO}
            style={styles.sectionPhoto}
            contentFit="cover"
            transition={220}
          />
          <LinearGradient
            colors={[
              "rgba(12,4,5,0.10)",
              "rgba(12,4,5,0.46)",
              "rgba(12,4,5,0.88)",
            ]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.sectionScrim}
          />
          <View pointerEvents="none" style={styles.sectionWatermarkWrap}>
            <Image
              source={BANCO_WATERMARK}
              style={styles.sectionWatermark}
              contentFit="contain"
              tintColor="#FFFFFF"
            />
          </View>
          <View style={[styles.bookingTopRow, { flexDirection: rowDir }]}>
            <View style={styles.sectionBadge}>
              <Feather name="calendar" size={18} color="#FFFFFF" />
            </View>
            <Feather
              name={isRTL ? "chevron-left" : "chevron-right"}
              size={20}
              color="rgba(255,255,255,0.85)"
            />
          </View>
          <View>
            <View
              style={[
                styles.sectionLabelRow,
                isRTL && { flexDirection: "row-reverse" },
              ]}
            >
              <View
                style={[styles.sectionAccent, { backgroundColor: colors.primary }]}
              />
              <AppText style={[styles.sectionLabel, { textAlign, fontSize: 18 }]}>
                {t("search.discover.bookingHub")}
              </AppText>
            </View>
            <AppText style={[styles.bookingSub, { textAlign }]}>
              {t("search.discover.bookingHubSub")}
            </AppText>
          </View>
        </View>
      </Pressable>

      {/* Explore on map — ALWAYS present on the Discover home (owner request).
          Routes to /section/real-estate?map=1; the host falls back to the list
          when a browse has no coordinates, so it never lands on an empty map. */}
      <Pressable
        onPress={onExploreMap}
        style={styles.mapCtaWrap}
        accessibilityRole="button"
        accessibilityLabel={t("search.discover.exploreMap")}
        testID="discover-explore-map"
      >
          <LinearGradient
            colors={["#23252B", "#0C0D10"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mapCta}
          >
            <Image
              source={require("../assets/images/banco-glow.png")}
              style={[styles.mapGlow, isRTL ? { left: -24 } : { right: -24 }]}
              contentFit="contain"
            />
            <View style={[styles.mapCtaRow, { flexDirection: rowDir }]}>
              <View style={[styles.mapBadge, { backgroundColor: colors.primary }]}>
                <Feather name="map" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.mapCtaText}>
                <AppText style={[styles.mapTitle, { textAlign }]}>
                  {t("search.discover.exploreMap")}
                </AppText>
                <AppText style={[styles.mapSub, { textAlign }]}>
                  {t("search.discover.exploreMapSub")}
                </AppText>
              </View>
              <Feather
                name={isRTL ? "chevron-left" : "chevron-right"}
                size={20}
                color="rgba(255,255,255,0.8)"
              />
            </View>
          </LinearGradient>
        </Pressable>

      {/* Car import — ENTER Cars mini-app with import engine seeded (never melts
          into shared Search). Strips/filters live inside SectionSearchApp. */}
      <Pressable
        onPress={() =>
          router.push(`${SECTION_ROUTE.car}?engine=import` as Href)
        }
        style={styles.hubCtaWrap}
        accessibilityRole="button"
        accessibilityLabel={t("search.discover.carImport")}
        testID="discover-car-import"
      >
        <LinearGradient
          colors={["#8A0E14", "#1C0507"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hubCta}
        >
          <View pointerEvents="none" style={styles.sectionWatermarkWrap}>
            <Image
              source={BANCO_WATERMARK}
              style={styles.hubWatermark}
              contentFit="contain"
              tintColor="#FFFFFF"
            />
          </View>
          <View style={[styles.mapCtaRow, { flexDirection: rowDir }]}>
            <View style={[styles.mapBadge, { backgroundColor: colors.primary }]}>
              <CategoryIcon category="car" color="#FFFFFF" />
            </View>
            <View style={styles.mapCtaText}>
              <AppText style={[styles.mapTitle, { textAlign }]}>
                {t("search.discover.carImport")}
              </AppText>
              <AppText style={[styles.mapSub, { textAlign }]}>
                {t("search.discover.carImportSub")}
              </AppText>
            </View>
            <Feather
              name={isRTL ? "chevron-left" : "chevron-right"}
              size={20}
              color="rgba(255,255,255,0.8)"
            />
          </View>
        </LinearGradient>
      </Pressable>

      {/* ── Business & supply hubs (الأعمال والتوريد) ────────────────────────
          Rectangular portal rows into the B2B worlds. Each carries the BANCO
          watermark so the identity never drops. Colours: supply = deep red
          family, importers = neutral charcoal, Banks & Financiers = the ONE
          trust-blue section outside the red family (deliberate, banks only). */}
      <SectionHeader label={t("search.discover.businessHub")} />

      <Pressable
        onPress={() => router.push("/business/global-supply")}
        style={styles.hubCtaWrap}
        accessibilityRole="button"
        accessibilityLabel={t("search.discover.supplyPortal")}
        testID="discover-supply-portal"
      >
        <LinearGradient
          colors={["#4A0D12", "#170506"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hubCta}
        >
          <View pointerEvents="none" style={styles.sectionWatermarkWrap}>
            <Image
              source={BANCO_WATERMARK}
              style={styles.hubWatermark}
              contentFit="contain"
              tintColor="#FFFFFF"
            />
          </View>
          <View style={[styles.mapCtaRow, { flexDirection: rowDir }]}>
            <View style={[styles.mapBadge, { backgroundColor: colors.primary }]}>
              <Feather name="globe" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.mapCtaText}>
              <AppText style={[styles.mapTitle, { textAlign }]}>
                {t("search.discover.supplyPortal")}
              </AppText>
              <AppText style={[styles.mapSub, { textAlign }]}>
                {t("search.discover.supplyPortalSub")}
              </AppText>
            </View>
            <Feather
              name={isRTL ? "chevron-left" : "chevron-right"}
              size={20}
              color="rgba(255,255,255,0.8)"
            />
          </View>
        </LinearGradient>
      </Pressable>

      <Pressable
        onPress={() => router.push("/business/supply-hub")}
        style={styles.hubCtaWrap}
        accessibilityRole="button"
        accessibilityLabel={t("search.discover.importersHub")}
        testID="discover-importers-hub"
      >
        <LinearGradient
          colors={["#23252B", "#0C0D10"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hubCta}
        >
          <View pointerEvents="none" style={styles.sectionWatermarkWrap}>
            <Image
              source={BANCO_WATERMARK}
              style={styles.hubWatermark}
              contentFit="contain"
              tintColor="#FFFFFF"
            />
          </View>
          <View style={[styles.mapCtaRow, { flexDirection: rowDir }]}>
            <View style={[styles.mapBadge, { backgroundColor: "rgba(255,255,255,0.16)" }]}>
              <Feather name="package" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.mapCtaText}>
              <AppText style={[styles.mapTitle, { textAlign }]}>
                {t("search.discover.importersHub")}
              </AppText>
              <AppText style={[styles.mapSub, { textAlign }]}>
                {t("search.discover.importersHubSub")}
              </AppText>
            </View>
            <Feather
              name={isRTL ? "chevron-left" : "chevron-right"}
              size={20}
              color="rgba(255,255,255,0.8)"
            />
          </View>
        </LinearGradient>
      </Pressable>

      <Pressable
        onPress={() => router.push("/business/banks" as Href)}
        style={styles.hubCtaWrap}
        accessibilityRole="button"
        accessibilityLabel={t("search.discover.banksHub")}
        testID="discover-banks-hub"
      >
        <LinearGradient
          colors={["#0D2B4A", "#071522"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hubCta}
        >
          <View pointerEvents="none" style={styles.sectionWatermarkWrap}>
            <Image
              source={BANCO_WATERMARK}
              style={styles.hubWatermark}
              contentFit="contain"
              tintColor="#FFFFFF"
            />
          </View>
          <View style={[styles.mapCtaRow, { flexDirection: rowDir }]}>
            <View style={[styles.mapBadge, { backgroundColor: "#1E6FD9" }]}>
              <Feather name="credit-card" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.mapCtaText}>
              <AppText style={[styles.mapTitle, { textAlign }]}>
                {t("search.discover.banksHub")}
              </AppText>
              <AppText style={[styles.mapSub, { textAlign }]}>
                {t("search.discover.banksHubSub")}
              </AppText>
            </View>
            <Feather
              name={isRTL ? "chevron-left" : "chevron-right"}
              size={20}
              color="rgba(255,255,255,0.8)"
            />
          </View>
        </LinearGradient>
      </Pressable>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 200 },
  sectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionCardWrap: {
    width: "47%",
    flexGrow: 1,
  },
  sectionCard: {
    height: 118,
    borderRadius: 20,
    overflow: "hidden",
    padding: 14,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    // Premium depth: each card reads as a framed, elevated tile.
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  sectionPhoto: {
    ...StyleSheet.absoluteFillObject,
  },
  sectionScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sectionWatermarkWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionWatermark: {
    width: "52%",
    height: "34%",
    opacity: 0.1,
  },
  sectionBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  sectionAccent: {
    width: 3,
    height: 15,
    borderRadius: 2,
  },
  sectionLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  sectionChevron: {
    position: "absolute",
    top: 14,
  },
  mapCtaWrap: {
    marginHorizontal: 16,
    marginTop: 18,
  },
  mapCta: {
    borderRadius: 18,
    overflow: "hidden",
    padding: 16,
  },
  mapGlow: {
    position: "absolute",
    top: -16,
    bottom: -16,
    width: 130,
    opacity: 0.5,
  },
  mapCtaRow: {
    alignItems: "center",
    gap: 14,
  },
  mapBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  mapCtaText: {
    flex: 1,
  },
  mapTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  mapSub: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
    marginTop: 2,
  },
  bookingCardWrap: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  bookingCard: {
    height: 150,
    borderRadius: 20,
    overflow: "hidden",
    padding: 14,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  bookingTopRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  bookingSub: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    marginTop: 3,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  hubCtaWrap: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  hubCta: {
    borderRadius: 18,
    overflow: "hidden",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  hubWatermark: {
    width: "40%",
    height: "60%",
    opacity: 0.08,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 12,
  },
  chipRow: {
    gap: 8,
    paddingHorizontal: 16,
  },
  brandChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  brandChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  savedChip: {
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 200,
  },
  savedChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  cardRow: {
    gap: 12,
    paddingHorizontal: 16,
  },
  cCard: {
    width: 168,
    borderWidth: 1,
    overflow: "hidden",
  },
  cImgWrap: {
    height: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  cImg: {
    width: "100%",
    height: "100%",
  },
  cTag: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cTagText: {
    fontSize: 11,
    color: "#FFFFFF",
  },
  cBody: {
    padding: 10,
    gap: 3,
  },
  cPrice: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  cTitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  loadingRow: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginHorizontal: 16,
  },
});
