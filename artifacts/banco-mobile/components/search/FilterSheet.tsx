import { Feather, Ionicons } from "@/components/icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type {
  SearchListingsFuelType,
  SearchListingsIndustry,
  SearchListingsOriginType,
  SearchListingsTransmission,
} from "@workspace/api-client-react";

import { AppText } from "@/components/AppText";
import {
  apiCategoryFor,
  Category,
  CategoryIcon,
  EngineChips,
} from "@/components/CategoryTabs";
import { brandLabel, type CarBrand } from "@/constants/cars";
import { engineByKey, type EngineDef } from "@/constants/engines";
import {
  INDUSTRY_TYPES,
  MATERIAL_TYPES,
  PROPERTY_TYPES,
} from "@/constants/listingCreateTaxonomy";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { NEAR_RADIUS_OPTIONS_KM } from "@/lib/nearMe";
import {
  MARKET_COUNTRIES,
  marketCountryLabel,
  rentalTermsForSearch,
  sanitizeRentalTermForMarket,
} from "@/lib/searchTaxonomy";
import type {
  PaymentType,
  SearchCriteria,
  SearchSort,
} from "@/lib/searchParams";

const SORTS: SearchSort[] = [
  "recommended",
  "newest",
  "price_asc",
  "price_desc",
  "popular",
];
const PAYMENTS: PaymentType[] = ["any", "installment"];

// Section-specific attribute filters. These criteria/back-end params existed but
// had NO controls in the sheet — cars get fuel + transmission, industrial gets
// industry + origin, each a single-select chip row (tap again to clear).
const FUELS: SearchListingsFuelType[] = [
  "petrol",
  "diesel",
  "hybrid",
  "electric",
  "natural_gas",
];
const FUEL_LABEL_KEY: Record<SearchListingsFuelType, string> = {
  petrol: "petrol",
  diesel: "diesel",
  hybrid: "hybrid",
  electric: "electric",
  natural_gas: "naturalGas",
};
const TRANSMISSIONS: SearchListingsTransmission[] = [
  "manual",
  "automatic",
  "cvt",
];
const ORIGINS: SearchListingsOriginType[] = ["local", "imported"];

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  criteria: SearchCriteria;
  /** Facet-gated categories (the active one is always kept visible). */
  shownCategories: Category[];
  /** Facet-gated engine chips for the active category (single-select "Type"). */
  engines: EngineDef[];
  /** Quick brand chips (cars only). */
  quickBrands: CarBrand[];
  brandValue: string | null;
  locationLabel: string;
  onSelectCategory: (c: Category) => void;
  onSelectEngine: (key: string) => void;
  onBrowseBrand: (b: CarBrand) => void;
  onOpenBrandPicker: () => void;
  onUpdate: (partial: Partial<SearchCriteria>) => void;
  onOpenLocationPicker: () => void;
  onClearLocation: () => void;
  onToggleNearMe: () => void;
  onClearAll: () => void;
  /**
   * Hide the Category chip row entirely. Used by the dedicated section pages
   * where the category is locked and must never be switched from the sheet.
   */
  lockCategory?: boolean;
  /**
   * Hide the payment type (cash / installment) row entirely.
   * Used by rental-locked pages where installment is irrelevant.
   */
  hidePaymentType?: boolean;
  /**
   * Optional restrict of RE property-type chips (Stay passes studio/apartment/
   * villa/chalet only — never land/commercial in a stays browse).
   */
  propertyTypeOptions?: string[];
}

/**
 * The Search mini-app filter bottom sheet. Chip rows (sort / category / type /
 * brand / payment) apply immediately through `onUpdate` so the results behind
 * the sheet stay live; the free-text price and year ranges are local drafts
 * committed on "Apply" (a keystroke-per-query there would be wasteful). Every
 * control maps to a real backend param and the category / type chips are
 * facet-gated by the caller, so the sheet never offers a permanently-empty
 * filter.
 */
export function FilterSheet({
  visible,
  onClose,
  criteria,
  shownCategories,
  engines,
  quickBrands,
  brandValue,
  locationLabel,
  onSelectCategory,
  onSelectEngine,
  onBrowseBrand,
  onOpenBrandPicker,
  onUpdate,
  onOpenLocationPicker,
  onClearLocation,
  onToggleNearMe,
  onClearAll,
  lockCategory = false,
  hidePaymentType = false,
  propertyTypeOptions,
}: FilterSheetProps) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();

  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const propertyTypeDefs =
    propertyTypeOptions && propertyTypeOptions.length > 0
      ? PROPERTY_TYPES.filter((p) => propertyTypeOptions.includes(p.value))
      : PROPERTY_TYPES;

  // Price / year are drafts: re-synced from the committed criteria each time the
  // sheet opens, then applied together on the Apply button.
  const [minPrice, setMinPrice] = useState(criteria.minPrice);
  const [maxPrice, setMaxPrice] = useState(criteria.maxPrice);
  const [minYear, setMinYear] = useState(criteria.minYear);
  const [maxYear, setMaxYear] = useState(criteria.maxYear);

  useEffect(() => {
    if (!visible) return;
    setMinPrice(criteria.minPrice);
    setMaxPrice(criteria.maxPrice);
    setMinYear(criteria.minYear);
    setMaxYear(criteria.maxYear);
  }, [
    visible,
    criteria.minPrice,
    criteria.maxPrice,
    criteria.minYear,
    criteria.maxYear,
  ]);

  const apply = () => {
    onUpdate({ minPrice, maxPrice, minYear, maxYear });
    onClose();
  };

  const isCar = criteria.category === "car";
  const isRealEstate = criteria.category === "real_estate";
  const isIndustrial = apiCategoryFor(criteria.category) === "industrial";
  const showEngines = engines.length > 1;
  // Per-section content correctness: rental systems are rent-only — offering
  // them while the تمليك (sale) chip is active would be contradictory noise.
  const selectedEngine = engineByKey(criteria.category, criteria.engineKey);
  // Rent terms when offer axis is rent. Callers may pass refinement engines in
  // the sheet; strip still owns sale/rent via engineKey when it is an offer.
  const showRentalTerms =
    isRealEstate &&
    (selectedEngine?.params.offer_type === "rent" ||
      criteria.engineKey === "rent");
  // Industry = manufacturing sector. Never on raw_material (commodity is
  // `material` at create). Hide for materials+all too so the group browse
  // doesn't ask a factory-sector question over steel/resin listings.
  const showIndustry =
    isIndustrial &&
    !(
      criteria.category === "materials" &&
      (criteria.industrialType === "all" ||
        criteria.industrialType === "raw_material")
    );
  // Local/imported logistics: materials company only — facilities are sites.
  const showOrigin = criteria.category === "materials";
  // Commodity material chips: materials company, especially raw_material browse
  // (create writes specs.material). Shown for materials+all too so shoppers can
  // refine the group without picking a subtype first.
  const showMaterial =
    criteria.category === "materials" &&
    (criteria.industrialType === "all" ||
      criteria.industrialType === "raw_material");
  // Installment is a car / real-estate SALE-financing axis — never facilities/
  // materials, and never rent: a rental is paid per period, not financed, so
  // offering "تقسيط" while the rent engine is active is a wrong field.
  const showPayment =
    !hidePaymentType &&
    (criteria.category === "car" ||
      criteria.category === "real_estate" ||
      criteria.category === "all") &&
    selectedEngine?.params.offer_type !== "rent";
  const rentalTerms = rentalTermsForSearch(criteria.marketCountry);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              paddingBottom: insets.bottom + 12,
              maxHeight: "88%",
            },
          ]}
        >
          {/* Grabber + header */}
          <View
            style={[styles.handle, { backgroundColor: colors.border }]}
          />
          <View style={[styles.sheetHeader, { flexDirection: rowDir }]}>
            <AppText style={[styles.sheetTitle, { color: colors.foreground }]}>
              {t("search.filters")}
            </AppText>
            <Pressable onPress={onClearAll} hitSlop={8}>
              <AppText style={[styles.clearAll, { color: colors.primary }]}>
                {t("search.clearAll")}
              </AppText>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Sort */}
            <SectionLabel text={t("search.sortBy")} align={textAlign} colors={colors} />
            <View style={[styles.wrapRow, { flexDirection: rowDir }]}>
              {SORTS.map((s) => {
                const active = criteria.sort === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => onUpdate({ sort: s })}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.secondary,
                      },
                    ]}
                    testID={`sort-${s}`}
                  >
                    <AppText
                      style={[
                        styles.chipText,
                        {
                          color: active
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {t(`search.sortOptions.${s}`)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Market country — a universal axis, so it lives here for EVERY
                section as one compact, balanced inline row (not buried under
                rent only, not a separate oversized button). Switching market
                re-sanitizes the rental term to that market's legal regimes. */}
            <SectionLabel text={t("create.fields.market")} align={textAlign} colors={colors} />
            <View style={[styles.wrapRow, { flexDirection: rowDir }]}>
              {MARKET_COUNTRIES.map((m) => {
                const active = criteria.marketCountry === m.value;
                return (
                  <Pressable
                    key={m.value}
                    onPress={() =>
                      onUpdate({
                        marketCountry: m.value,
                        rentalTerm: sanitizeRentalTermForMarket(
                          criteria.rentalTerm,
                          m.value,
                        ),
                      })
                    }
                    style={[
                      styles.chipSm,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.secondary,
                      },
                    ]}
                    testID={`filter-market-${m.value}`}
                  >
                    <AppText
                      style={[
                        styles.chipSmText,
                        {
                          color: active
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {marketCountryLabel(m.value, isRTL)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Category — hidden inside the section mini-apps (lockCategory):
                the section is locked there, so a single dead chip is pure
                cross-section noise. The prop existed but was never wired. */}
            {!lockCategory && (
            <>
            <SectionLabel text={t("search.category")} align={textAlign} colors={colors} />
            <View style={[styles.wrapRow, { flexDirection: rowDir }]}>
              {shownCategories.map((cat) => {
                const active = criteria.category === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => onSelectCategory(cat)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.secondary,
                        flexDirection: rowDir,
                        alignItems: "center",
                        gap: 6,
                      },
                    ]}
                    testID={`filter-category-${cat}`}
                  >
                    <CategoryIcon
                      category={cat}
                      color={
                        active ? colors.primaryForeground : colors.mutedForeground
                      }
                    />
                    <AppText
                      style={[
                        styles.chipText,
                        {
                          color: active
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {t(`home.categories.${cat}`)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            </>
            )}

            {/* Type / refinements (facet-gated). RE passes refinements only —
                offer + propertyType live on section strips. */}
            {showEngines && (
              <>
                <SectionLabel
                  text={
                    isRealEstate ? t("search.options") : t("search.type")
                  }
                  align={textAlign}
                  colors={colors}
                />
                <View style={styles.engineWrap}>
                  <EngineChips
                    engines={engines}
                    selected={criteria.engineKey}
                    onChange={onSelectEngine}
                  />
                </View>
              </>
            )}

            {/* RE / Stay property type — syncs with type strip via propertyType.
                Stay passes propertyTypeOptions so land/commercial never appear. */}
            {isRealEstate && propertyTypeDefs.length > 0 && (
              <>
                <SectionLabel
                  text={t("create.fields.propertyType")}
                  align={textAlign}
                  colors={colors}
                />
                <ToggleChipRow
                  options={propertyTypeDefs.map((p) => p.value)}
                  selected={criteria.propertyType}
                  labelFor={(v) => {
                    const def = propertyTypeDefs.find((p) => p.value === v);
                    return def ? (isRTL ? def.ar : def.en) : v;
                  }}
                  onToggle={(v) => onUpdate({ propertyType: v })}
                  rowDir={rowDir}
                  colors={colors}
                  testPrefix="filter-property-type"
                />
                <SectionLabel
                  text={t("search.listingModeBuy")}
                  align={textAlign}
                  colors={colors}
                />
                <Pressable
                  onPress={() =>
                    onUpdate({
                      listingMode:
                        criteria.listingMode === "buy" ? "all" : "buy",
                    })
                  }
                  style={[
                    styles.chip,
                    {
                      alignSelf: isRTL ? "flex-end" : "flex-start",
                      backgroundColor:
                        criteria.listingMode === "buy"
                          ? colors.primary
                          : colors.secondary,
                    },
                  ]}
                  testID="filter-listing-mode-buy"
                >
                  <AppText
                    style={[
                      styles.chipText,
                      {
                        color:
                          criteria.listingMode === "buy"
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {t("search.listingModeBuy")}
                  </AppText>
                </Pressable>
              </>
            )}

            {/* Brand (cars) */}
            {isCar && (
              <>
                <SectionLabel text={t("search.brand")} align={textAlign} colors={colors} />
                <View style={[styles.wrapRow, { flexDirection: rowDir }]}>
                  <Pressable
                    onPress={onOpenBrandPicker}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: colors.secondary,
                        flexDirection: rowDir,
                        alignItems: "center",
                        gap: 4,
                      },
                    ]}
                    testID="filter-all-brands"
                  >
                    <Feather name="grid" size={13} color={colors.foreground} />
                    <AppText style={[styles.chipText, { color: colors.foreground }]}>
                      {t("search.allBrands")}
                    </AppText>
                  </Pressable>
                  {quickBrands.map((b) => {
                    const active = brandValue === b.value;
                    return (
                      <Pressable
                        key={b.value}
                        onPress={() => onBrowseBrand(b)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active
                              ? colors.primary
                              : colors.secondary,
                          },
                        ]}
                        testID={`filter-brand-${b.value}`}
                      >
                        <AppText
                          style={[
                            styles.chipText,
                            {
                              color: active
                                ? colors.primaryForeground
                                : colors.mutedForeground,
                            },
                          ]}
                        >
                          {brandLabel(b, isRTL)}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Year range (cars) */}
                <SectionLabel text={t("search.year")} align={textAlign} colors={colors} />
                <View style={[styles.rangeRow, { flexDirection: rowDir }]}>
                  <TextInput
                    value={minYear}
                    onChangeText={setMinYear}
                    placeholder={t("search.yearFrom")}
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    maxLength={4}
                    style={[
                      styles.rangeInput,
                      {
                        backgroundColor: colors.secondary,
                        color: colors.foreground,
                        textAlign,
                      },
                    ]}
                    testID="year-min"
                  />
                  <AppText style={{ color: colors.mutedForeground }}>—</AppText>
                  <TextInput
                    value={maxYear}
                    onChangeText={setMaxYear}
                    placeholder={t("search.yearTo")}
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    maxLength={4}
                    style={[
                      styles.rangeInput,
                      {
                        backgroundColor: colors.secondary,
                        color: colors.foreground,
                        textAlign,
                      },
                    ]}
                    testID="year-max"
                  />
                </View>

                {/* Fuel (cars) */}
                <SectionLabel text={t("create.fields.fuel")} align={textAlign} colors={colors} />
                <ToggleChipRow
                  options={FUELS}
                  selected={criteria.fuelType}
                  labelFor={(v) => t(`create.opts.${FUEL_LABEL_KEY[v]}`)}
                  onToggle={(v) => onUpdate({ fuelType: v })}
                  rowDir={rowDir}
                  colors={colors}
                  testPrefix="filter-fuel"
                />

                {/* Transmission (cars) */}
                <SectionLabel text={t("create.fields.transmission")} align={textAlign} colors={colors} />
                <ToggleChipRow
                  options={TRANSMISSIONS}
                  selected={criteria.transmission}
                  labelFor={(v) => t(`create.opts.${v}`)}
                  onToggle={(v) => onUpdate({ transmission: v })}
                  rowDir={rowDir}
                  colors={colors}
                  testPrefix="filter-transmission"
                />
              </>
            )}

            {/* Rental system (real estate) — furnished-daily / new-law / old-law /
                annual contract, per the market's actual rental regimes. Hidden
                while the sale (تمليك) engine chip is active (rent-only content). */}
            {showRentalTerms && (
              <>
                <SectionLabel text={t("create.fields.rentalTerm")} align={textAlign} colors={colors} />
                <ToggleChipRow
                  options={rentalTerms.map((r) => r.value)}
                  selected={criteria.rentalTerm}
                  labelFor={(v) => {
                    const def = rentalTerms.find((r) => r.value === v);
                    return def ? (isRTL ? def.ar : def.en) : v;
                  }}
                  onToggle={(v) => onUpdate({ rentalTerm: v })}
                  rowDir={rowDir}
                  colors={colors}
                  testPrefix="filter-rental-term"
                />
              </>
            )}

            {/* Industry (facilities / machine / production_line) + material +
                origin (materials only). Flags already computed — do not collapse
                to raw isIndustrial or origin leaks into factories and material
                chips stay dead (prior wipe). */}
            {(showIndustry || showOrigin || showMaterial) && (
              <>
                {showIndustry ? (
                  <>
                    <SectionLabel
                      text={t("create.fields.industry")}
                      align={textAlign}
                      colors={colors}
                    />
                    <ToggleChipRow
                      options={INDUSTRY_TYPES.map(
                        (i) => i.value as SearchListingsIndustry,
                      )}
                      selected={criteria.industry}
                      labelFor={(v) => {
                        const def = INDUSTRY_TYPES.find((i) => i.value === v);
                        return def ? (isRTL ? def.ar : def.en) : v;
                      }}
                      onToggle={(v) => onUpdate({ industry: v })}
                      rowDir={rowDir}
                      colors={colors}
                      testPrefix="filter-industry"
                    />
                  </>
                ) : null}

                {showMaterial ? (
                  <>
                    <SectionLabel
                      text={t("create.fields.material")}
                      align={textAlign}
                      colors={colors}
                    />
                    <ToggleChipRow
                      options={MATERIAL_TYPES.map((m) => m.value)}
                      selected={criteria.material}
                      labelFor={(v) => {
                        const def = MATERIAL_TYPES.find((m) => m.value === v);
                        return def ? (isRTL ? def.ar : def.en) : v;
                      }}
                      onToggle={(v) => onUpdate({ material: v })}
                      rowDir={rowDir}
                      colors={colors}
                      testPrefix="filter-material"
                    />
                  </>
                ) : null}

                {showOrigin ? (
                  <>
                    <SectionLabel
                      text={t("create.fields.origin")}
                      align={textAlign}
                      colors={colors}
                    />
                    <ToggleChipRow
                      options={ORIGINS}
                      selected={criteria.originType}
                      labelFor={(v) => t(`create.opts.${v}`)}
                      onToggle={(v) => onUpdate({ originType: v })}
                      rowDir={rowDir}
                      colors={colors}
                      testPrefix="filter-origin"
                    />
                  </>
                ) : null}
              </>
            )}

            {/* Location */}
            <SectionLabel text={t("search.location")} align={textAlign} colors={colors} />
            <Pressable
              onPress={onOpenLocationPicker}
              style={[
                styles.locationTrigger,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  flexDirection: rowDir,
                },
              ]}
              testID="filter-location-trigger"
            >
              <View style={[styles.locationLeft, { flexDirection: rowDir }]}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={colors.mutedForeground}
                />
                <AppText
                  style={[
                    styles.locationText,
                    {
                      color: criteria.location
                        ? colors.foreground
                        : colors.mutedForeground,
                      textAlign,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {criteria.location ? locationLabel : t("locationPicker.any")}
                </AppText>
              </View>
              {criteria.location ? (
                <Pressable onPress={onClearLocation} hitSlop={8}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </Pressable>
              ) : (
                <Feather
                  name={isRTL ? "chevron-left" : "chevron-right"}
                  size={16}
                  color={colors.mutedForeground}
                />
              )}
            </Pressable>
            <Pressable
              onPress={onToggleNearMe}
              style={[
                styles.chip,
                {
                  alignSelf: "flex-start",
                  marginTop: 8,
                  backgroundColor: criteria.nearMeEnabled
                    ? colors.primary
                    : colors.secondary,
                  flexDirection: rowDir,
                  alignItems: "center",
                  gap: 6,
                },
              ]}
              testID="filter-near-me"
            >
              <Feather
                name="map-pin"
                size={14}
                color={
                  criteria.nearMeEnabled
                    ? colors.primaryForeground
                    : colors.mutedForeground
                }
              />
              <AppText
                style={[
                  styles.chipText,
                  {
                    color: criteria.nearMeEnabled
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                  },
                ]}
              >
                {t("search.nearMe")}
              </AppText>
            </Pressable>

            {/* Search radius — rendered ONLY while near-me is on, so the compact
                sheet keeps its default height when the feature is unused. The
                value already travels to the server as radius_km. */}
            {criteria.nearMeEnabled ? (
              <View
                style={{
                  flexDirection: rowDir,
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 8,
                }}
                testID="filter-near-radius"
              >
                {NEAR_RADIUS_OPTIONS_KM.map((km) => {
                  const active = criteria.nearRadiusKm === km;
                  return (
                    <Pressable
                      key={km}
                      onPress={() => onUpdate({ nearRadiusKm: km })}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active
                            ? colors.primary
                            : colors.secondary,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${km} ${t("search.kmShort")}`}
                      testID={`filter-radius-${km}`}
                    >
                      <AppText
                        style={[
                          styles.chipText,
                          {
                            color: active
                              ? colors.primaryForeground
                              : colors.mutedForeground,
                          },
                        ]}
                      >
                        {km} {t("search.kmShort")}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {/* Price */}
            <SectionLabel text={t("search.price")} align={textAlign} colors={colors} />
            <View style={[styles.rangeRow, { flexDirection: rowDir }]}>
              <TextInput
                value={minPrice}
                onChangeText={setMinPrice}
                placeholder={t("search.minPrice")}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={[
                  styles.rangeInput,
                  {
                    backgroundColor: colors.secondary,
                    color: colors.foreground,
                    textAlign,
                  },
                ]}
                testID="price-min"
              />
              <AppText style={{ color: colors.mutedForeground }}>—</AppText>
              <TextInput
                value={maxPrice}
                onChangeText={setMaxPrice}
                placeholder={t("search.maxPrice")}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={[
                  styles.rangeInput,
                  {
                    backgroundColor: colors.secondary,
                    color: colors.foreground,
                    textAlign,
                  },
                ]}
                testID="price-max"
              />
            </View>

            {/* Payment — gated by showPayment (the flag was computed but never
                wired, so "تقسيط" leaked into rent/industrial sheets). */}
            {showPayment && (
            <>
            <SectionLabel text={t("search.paymentType")} align={textAlign} colors={colors} />
            <View style={[styles.chipRow, { flexDirection: rowDir }]}>
              {PAYMENTS.map((pt) => {
                const active = criteria.paymentType === pt;
                return (
                  <Pressable
                    key={pt}
                    onPress={() => onUpdate({ paymentType: pt })}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.secondary,
                      },
                    ]}
                    testID={`payment-${pt}`}
                  >
                    <AppText
                      style={[
                        styles.chipText,
                        {
                          color: active
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {pt === "any" ? t("search.any") : t("search.installmentOnly")}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            </>
            )}
          </ScrollView>

          {/* Apply footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable
              onPress={apply}
              style={[
                styles.applyBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius },
              ]}
              testID="filter-apply"
            >
              <AppText
                style={[styles.applyText, { color: colors.primaryForeground }]}
              >
                {t("search.apply")}
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Single-select chip row: tapping the active chip clears the filter (null). */
function ToggleChipRow<T extends string>({
  options,
  selected,
  labelFor,
  onToggle,
  rowDir,
  colors,
  testPrefix,
}: {
  options: T[];
  selected: T | null;
  labelFor: (v: T) => string;
  onToggle: (v: T | null) => void;
  rowDir: "row" | "row-reverse";
  colors: ReturnType<typeof useColors>;
  testPrefix: string;
}) {
  return (
    <View style={[styles.wrapRow, { flexDirection: rowDir }]}>
      {options.map((v) => {
        const active = selected === v;
        return (
          <Pressable
            key={v}
            onPress={() => onToggle(active ? null : v)}
            style={[
              styles.chip,
              { backgroundColor: active ? colors.primary : colors.secondary },
            ]}
            testID={`${testPrefix}-${v}`}
          >
            <AppText
              style={[
                styles.chipText,
                {
                  color: active
                    ? colors.primaryForeground
                    : colors.mutedForeground,
                },
              ]}
            >
              {labelFor(v)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionLabel({
  text,
  align,
  colors,
}: {
  text: string;
  align: "left" | "right";
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <AppText
      style={[styles.sectionLabel, { color: colors.mutedForeground, textAlign: align }]}
    >
      {text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: "100%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  clearAll: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 6,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 2,
  },
  // Compressed row: long option sets (markets, property types, sort) WRAP onto
  // as many short lines as they need instead of running off the side of the
  // screen. Measured before: the market row was 1485px of content inside a 343px
  // window — over four screens of sideways scrolling, so a user could not see
  // what they were choosing between and options past the fold were effectively
  // invisible. Wrapping shows every option at once, in place, with no scrolling
  // in either axis. This is the same shape the create screen already uses for
  // these very markets, so it is the established pattern here, not a new idea.
  wrapRow: {
    flexWrap: "wrap",
    gap: 6,
    paddingVertical: 2,
  },
  engineWrap: {
    marginHorizontal: -16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  chipText: {
    fontSize: 12.5,
    fontFamily: "Inter_500Medium",
  },
  // Compact variant — the always-visible market-country row: one notch smaller
  // than the standard chips so the strip reads balanced, never dominant.
  chipSm: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  chipSmText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  rangeRow: {
    alignItems: "center",
    gap: 10,
  },
  rangeInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  locationTrigger: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  locationLeft: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  applyBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  applyText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
