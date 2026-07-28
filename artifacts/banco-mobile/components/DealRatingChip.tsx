import { View, StyleSheet } from "react-native";
import { Feather } from "@/components/icons";
import {
  useGetListingInsights,
  getGetListingInsightsQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/LanguageContext";
import { AppText } from "@/components/AppText";

/**
 * A small, honest "deal rating" pill for the listing detail — how this price
 * compares to its real market segment (powered by GET /v1/listings/:id/insights).
 *
 * Deliberately renders NOTHING when the segment lacks enough real samples
 * (rating "insufficient_data") or the query hasn't resolved — we never show a
 * fabricated verdict. Additive and self-contained: it introduces no layout of
 * its own beyond one inline pill and uses the app's theme tokens, so it can be
 * dropped next to the price without touching the surrounding design.
 */

type Tone = "good" | "neutral" | "warn";

const RATING_META: Record<
  string,
  { labelKey: string; icon: keyof typeof Feather.glyphMap; tone: Tone }
> = {
  great_deal: { labelKey: "dealRating.great", icon: "trending-down", tone: "good" },
  good_deal: { labelKey: "dealRating.good", icon: "check-circle", tone: "good" },
  fair: { labelKey: "dealRating.fair", icon: "minus-circle", tone: "neutral" },
  above_market: { labelKey: "dealRating.above", icon: "trending-up", tone: "warn" },
};

// Semantic rating colours, scoped to this pill (the theme has no green/amber
// token). Universal price-rating semantics; additive, not a design-system change.
const TONE_COLOR: Record<Tone, string> = {
  good: "#1FA97D",
  neutral: "#8A8A8E",
  warn: "#E0A106",
};

export function DealRatingChip({ listingId }: { listingId: string }) {
  const colors = useColors();
  const { t } = useI18n();
  const { data } = useGetListingInsights(listingId, {
    query: {
      queryKey: getGetListingInsightsQueryKey(listingId),
      staleTime: 60_000,
      retry: 1,
    },
  });

  const insights = data?.data;
  if (!insights || insights.rating === "insufficient_data") return null;

  const meta = RATING_META[insights.rating];
  if (!meta) return null;

  const tone = TONE_COLOR[meta.tone];
  // How far below/above the segment median, shown only when we have it and it is
  // material (≥3%), so tiny noise never adds a distracting number.
  const delta = insights.delta_pct;
  const showDelta = typeof delta === "number" && Math.abs(delta) >= 3;
  const deltaText = showDelta
    ? ` · ${delta < 0 ? "−" : "+"}${Math.abs(Math.round(delta))}%`
    : "";

  return (
    <View
      style={[styles.chip, { backgroundColor: tone + "1A", borderRadius: colors.radius }]}
      accessibilityRole="text"
      testID="deal-rating-chip"
    >
      <Feather name={meta.icon} size={13} color={tone} />
      <AppText style={[styles.label, { color: tone }]}>
        {t(meta.labelKey)}
        {deltaText}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
