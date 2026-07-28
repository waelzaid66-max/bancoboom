import { Feather, Ionicons } from "@/components/icons";
import type { TextInput as RNTextInput } from "react-native";
import {
  getAutocomplete,
  sendBehaviorSignal,
  FeedItem,
  SearchListingsCategory,
} from "@workspace/api-client-react";
import { router, useLocalSearchParams, useNavigation, type Href } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { FilterPill } from "@/components/search/FilterPill";
import { LocationPicker } from "@/components/LocationPicker";
import { SkeletonCard } from "@/components/SkeletonCard";
import { StayCard, STAYS_ACCENT } from "@/components/StayCard";
import { StaysHomeHeader, type StayTypeTab } from "@/components/search/stays/StaysHomeHeader";
import { SearchResultsSurface } from "@/components/search/SearchResultsSurface";
import { SearchResultsMap } from "@/components/search/SearchResultsMap";
import { FilterSheet } from "@/components/search/FilterSheet";
import { MiniAppBottomNav } from "@/components/MiniAppBottomNav";
import { apiCategoryFor } from "@/components/CategoryTabs";
import { labelForValue } from "@/constants/locations";
import {
  DEFAULT_MARKET_COUNTRY,
  PROPERTY_TYPES,
} from "@/constants/listingCreateTaxonomy";
import {
  loadPreferredMarketCountry,
  savePreferredMarketCountry,
} from "@/lib/marketPreference";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSound } from "@/context/SoundContext";
import { useColors } from "@/hooks/useColors";
import { useSearchMiniApp } from "@/hooks/useSearchMiniApp";
import {
  DEFAULT_CRITERIA,
  SearchCriteria,
  mapAnchorKey,
} from "@/lib/searchParams";
import { requestNearMeCoords, DEFAULT_NEAR_RADIUS_KM } from "@/lib/nearMe";
import {
  MarketCountryButton,
  MarketCountryPicker,
} from "@/components/MarketCountryPicker";
import {
  rentalTermsForSearch,
  sanitizeRentalTermForMarket,
} from "@/lib/searchTaxonomy";

const ALL_TAB = "__all__";

// The stays type tabs (per the approved header mock): Stays (all) · Studio ·
// Apartment · Villa · Chalet. Labels come from the canonical PROPERTY_TYPES
// taxonomy so the tab wording always matches create/search. Rental TERM is a
// secondary strip under the market matrix (also in FilterSheet) — both drive
// the same criteria.rentalTerm axis.
// "office" added: serviced / furnished offices are bookable daily stays.
// The label comes from PROPERTY_TYPES ("Office" / "مكتب") — same taxonomy
// used everywhere else so the copy is never out of sync.
const STAY_TYPE_VALUES = ["studio", "apartment", "villa", "chalet", "office"] as const;
const STAY_TYPE_OPTIONS = [...STAY_TYPE_VALUES];

/** Deterministic, key-sorted serialization used for baseline-delta dirty checks
 *  (mirrors SectionSearchApp — a freshly-landed page is never falsely dirty). */
function serializeCriteria(c: SearchCriteria): string {
  return (Object.keys(c) as (keyof SearchCriteria)[])
    .sort()
    .map((k) => `${String(k)}=${JSON.stringify(c[k])}`)
    .join("|");
}

/** Compact icon-trigger + inline modal picker for the rental-term filter.
 *  Replaces the horizontal chip strip so the header stays lean (owner). */
function RentalTermPickerButton({
  terms,
  selected,
  onSelect,
}: {
  terms: { value: string; en: string; ar: string }[];
  selected: string | null;
  onSelect: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const colors = useColors();
  const { isRTL, t } = useI18n();
  const rowDir = isRTL ? "row-reverse" : "row";
  const activeTerm = terms.find((r) => r.value === selected);
  const label = activeTerm
    ? isRTL
      ? activeTerm.ar
      : activeTerm.en
    : t("search.discover.rentalTermAny");

  return (
    <>
      {/* This pill IS the extraction source: FilterPill carries its metrics to
          the pixel (108×25, padding 4/10, gap 5, radius 20). Using it here keeps
          one shape in one place instead of a copy that drifts. */}
      <FilterPill
        icon="calendar"
        label={label}
        active={!!selected}
        accentColor={STAYS_ACCENT}
        onPress={() => setOpen(true)}
        testID="stays-rental-term-btn"
      />

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.termBackdrop} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.termSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <AppText
              style={[
                styles.termSheetTitle,
                { color: colors.foreground, borderBottomColor: colors.border },
              ]}
            >
              {t("create.fields.rentalTerm")}
            </AppText>
            {/* "All types" row */}
            <Pressable
              onPress={() => { onSelect(null); setOpen(false); }}
              style={[
                styles.termRow,
                { flexDirection: rowDir, borderBottomColor: colors.border },
                !selected
                  ? { backgroundColor: `${STAYS_ACCENT}1A` }
                  : null,
              ]}
            >
              <AppText style={[styles.termRowText, { color: colors.foreground }]}>
                {t("search.discover.rentalTermAny")}
              </AppText>
              {!selected && <Feather name="check" size={15} color={STAYS_ACCENT} />}
            </Pressable>
            {terms.map((r) => {
              const active = r.value === selected;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => { onSelect(r.value); setOpen(false); }}
                  style={[
                    styles.termRow,
                    { flexDirection: rowDir, borderBottomColor: colors.border },
                    active ? { backgroundColor: `${STAYS_ACCENT}1A` } : null,
                  ]}
                >
                  <AppText style={[styles.termRowText, { color: colors.foreground }]}>
                    {isRTL ? r.ar : r.en}
                  </AppText>
                  {active && <Feather name="check" size={15} color={STAYS_ACCENT} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/**
 * Booking & Stays — a Booking.com-style stays experience built on the section
 * search engine. It locks the category to real_estate and the engine to rent,
 * then makes the market's real rental-term taxonomy the PRIMARY segmentation:
 * a prominent tab strip ("All" + the market's honest terms — EG: daily /
 * new-law / old-law, Gulf: daily / annual). Results render as StayCards; the
 * furnished/daily units carry a "bookable" ribbon and reserve from their detail
 * via the existing BookingCard. Everything else (baseline-delta exit-confirm,
 * market hydration, pull-to-refresh, infinite scroll, map, near-me) reuses the
 * proven mini-app machinery. No backend changes.
 */
export function BookingStaysApp() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { playSound } = useSound();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {
    sessionId,
    isSaved,
    toggleSave,
    saveSearch,
    isSearchSaved,
    cacheFeedItem,
    recordQuery,
  } = useSession();
  // Never invent a 67px web pad — that crushed Stay chrome on Replit web.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);

  const onCommitted = useCallback(
    (c: SearchCriteria) => {
      sendBehaviorSignal({
        session_id: sessionId,
        action: "click",
        category: apiCategoryFor(c.category) as SearchListingsCategory | undefined,
      }).catch(() => {});
    },
    [sessionId],
  );

  const search = useSearchMiniApp(onCommitted);
  const {
    criteria,
    items,
    viewState,
    phase,
    hasNext,
    commit: commitRaw,
    update: updateRaw,
    applyPatch: applyPatchRaw,
    loadMore,
    retry,
  } = search;

  // Hard lock (fact): Stay is always real_estate + rent — never melt to another
  // category/engine via a partial update.
  const commit = useCallback(
    (next: SearchCriteria) => {
      commitRaw({ ...next, category: "real_estate", engineKey: "rent" });
    },
    [commitRaw],
  );
  const update = useCallback(
    (partial: Partial<SearchCriteria>) => {
      updateRaw({ ...partial, category: "real_estate", engineKey: "rent" });
    },
    [updateRaw],
  );
  const applyPatch = useCallback(
    (partial: Partial<SearchCriteria>) => {
      applyPatchRaw({ ...partial, category: "real_estate", engineKey: "rent" });
    },
    [applyPatchRaw],
  );

  // The clean, per-entry baseline: real_estate + rent + market's default term
  // basis (null → "All"). Dirty = any delta from this, so entering never prompts.
  const buildSeed = useCallback(
    (market: string): SearchCriteria => ({
      ...DEFAULT_CRITERIA,
      marketCountry: market,
      category: "real_estate",
      engineKey: "rent",
      rentalTerm: sanitizeRentalTermForMarket(null, market),
    }),
    [],
  );
  const baselineRef = useRef<SearchCriteria | null>(null);

  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const seed = buildSeed(criteria.marketCountry);
    baselineRef.current = seed;
    commit(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Native: hydrate the persisted market once, advancing the baseline in lockstep
  // so a non-default saved market is not treated as "dirty".
  const marketHydrated = useRef(Platform.OS === "web");
  useEffect(() => {
    if (marketHydrated.current) return;
    let cancelled = false;
    void loadPreferredMarketCountry().then((iso) => {
      if (cancelled) return;
      marketHydrated.current = true;
      if (iso === criteria.marketCountry) return;
      const marketPatch: Partial<SearchCriteria> = {
        marketCountry: iso,
        rentalTerm: sanitizeRentalTermForMarket(null, iso),
      };
      if (baselineRef.current) {
        baselineRef.current = { ...baselineRef.current, ...marketPatch };
      }
      applyPatch(marketPatch);
      if (items.length > 0 || phase !== "idle") retry();
    });
    return () => {
      cancelled = true;
    };
  }, [applyPatch, retry, items.length, phase, criteria.marketCountry]);

  // ── Map view (?map=1 deep-link latch, same MOB-07 contract as RE) ──
  const params = useLocalSearchParams<{ map?: string | string[] }>();
  const mapParam = Array.isArray(params.map) ? params.map[0] : params.map;
  const [mapMode, setMapMode] = useState(false);
  const [wantMap, setWantMap] = useState(
    () => mapParam === "1" || mapParam === "true",
  );
  const [marketPickerOpen, setMarketPickerOpen] = useState(false);
  const mappableItems = useMemo(
    () =>
      items.filter(
        (i) =>
          i.coordinates &&
          Number.isFinite(i.coordinates.lat) &&
          Number.isFinite(i.coordinates.lng),
      ),
    [items],
  );
  const inResultsView = viewState === "results";
  const hasPagePins = mappableItems.length > 0;
  useEffect(() => {
    if (!inResultsView && mapMode) setMapMode(false);
  }, [inResultsView, mapMode]);

  useEffect(() => {
    if (!wantMap) return;
    // Stay map can open once results exist — server clusters fill gaps even
    // when the loaded page has few pins (do not hard-require hasPagePins).
    if (inResultsView) {
      setMapMode(true);
      setWantMap(false);
    } else if (viewState === "empty" || viewState === "error") {
      setWantMap(false);
    }
  }, [wantMap, inResultsView, viewState]);

  const mapSectionKey = mapAnchorKey(criteria);
  const prevMapSectionKey = useRef(mapSectionKey);
  useEffect(() => {
    if (prevMapSectionKey.current === mapSectionKey) return;
    prevMapSectionKey.current = mapSectionKey;
    // Keep map open across filter tweaks only when user is already in map;
    // section-key change from market/type still drops to list for clarity.
    setMapMode(false);
  }, [mapSectionKey]);

  // ── Text query + autocomplete (real_estate-scoped) ──
  const [draftQuery, setDraftQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  // The search box is tap-to-open (an icon), not a permanent rectangle. Opening
  // focuses the field; closing (toggle / submit) collapses it back to the icon.
  const openSearch = () => {
    playSound("tap");
    setSearchOpen(true);
    setShowSuggestions(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const autocompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<RNTextInput>(null);
  const autocompleteSeq = useRef(0);

  useEffect(
    () => () => {
      if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current);
      if (commitTimer.current) clearTimeout(commitTimer.current);
    },
    [],
  );

  const fetchAutocomplete = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const seq = ++autocompleteSeq.current;
    try {
      // Autocomplete takes only `q` (no category param on the endpoint).
      const res = await getAutocomplete({ q });
      if (seq !== autocompleteSeq.current) return;
      setSuggestions(res.data ?? []);
    } catch {
      if (seq !== autocompleteSeq.current) return;
      setSuggestions([]);
    }
  }, []);

  const handleQueryChange = (text: string) => {
    setDraftQuery(text);
    setShowSuggestions(true);
    if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current);
    autocompleteTimer.current = setTimeout(() => fetchAutocomplete(text), 250);
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => update({ q: text }), 350);
  };

  const commitQueryNow = (q: string) => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    setShowSuggestions(false);
    recordQuery(q);
    update({ q });
  };

  const clearQuery = () => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    setDraftQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    update({ q: "" });
  };

  const handleSuggestionTap = (s: string) => {
    setDraftQuery(s);
    commitQueryNow(s);
  };

  const handleCardPress = useCallback(
    (item: FeedItem) => {
      cacheFeedItem(item);
      router.push(`/listing/${item.id}?focus=booking` as Href);
    },
    [cacheFeedItem],
  );

  // Type tabs: Stays(all) / studio / apartment / villa / chalet.
  // Rental TERM (daily/new-law/annual) = secondary strip + FilterSheet (same axis).
  const activeStayType = criteria.propertyType ?? ALL_TAB;
  // Tabs passed to StaysHomeHeader (Band D) — includes "All" + typed options.
  const typeTabs: StayTypeTab[] = [
    { value: ALL_TAB, label: t("search.discover.section.staysTabAll") },
    ...STAY_TYPE_VALUES.map((v) => {
      const def = PROPERTY_TYPES.find((p) => p.value === v);
      return { value: v, label: def ? (isRTL ? def.ar : def.en) : v };
    }),
  ];
  const selectStayType = (value: string) => {
    playSound("tap");
    Haptics.selectionAsync();
    if (value === ALL_TAB) {
      update({ propertyType: null });
    } else {
      update({ propertyType: value, engineKey: "rent" });
    }
  };

  const selectRentalTerm = (term: string) => {
    playSound("tap");
    Haptics.selectionAsync();
    update({
      rentalTerm: criteria.rentalTerm === term ? null : term,
      engineKey: "rent",
    });
  };

  const selectListingModeWanted = () => {
    playSound("tap");
    Haptics.selectionAsync();
    update({
      listingMode: criteria.listingMode === "buy" ? "all" : "buy",
    });
  };

  const selectMarketCountry = (code: string) => {
    void savePreferredMarketCountry(code);
    update({
      marketCountry: code,
      rentalTerm: sanitizeRentalTermForMarket(criteria.rentalTerm, code),
    });
  };

  const toggleNearMe = useCallback(async () => {
    if (criteria.nearMeEnabled) {
      update({ nearMeEnabled: false, nearLat: null, nearLng: null });
      return;
    }
    const coords = await requestNearMeCoords();
    if (!coords) {
      Alert.alert(t("search.nearMe"), t("search.nearMeDenied"));
      return;
    }
    update({
      nearMeEnabled: true,
      nearLat: coords.lat,
      nearLng: coords.lng,
      nearRadiusKm: DEFAULT_NEAR_RADIUS_KM,
    });
  }, [criteria.nearMeEnabled, t, update]);

  // "Clear all" → this page's clean baseline (real_estate + rent + All, market
  // preserved). Post-reset the page is not dirty.
  const clearAllFilters = useCallback(() => {
    setDraftQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchOpen(false);
    setShowFilters(false);
    setMapMode(false);
    const baseline = baselineRef.current ?? buildSeed(criteria.marketCountry);
    commit(baseline);
  }, [buildSeed, commit, criteria.marketCountry]);

  // Honest badge: every Stay chrome/sheet axis that narrows results.
  const activeFilterCount = [
    !!criteria.propertyType,
    !!criteria.minPrice || !!criteria.maxPrice,
    !!criteria.location,
    criteria.nearMeEnabled,
    !!criteria.rentalTerm,
    criteria.listingMode !== "all",
    criteria.sort !== "recommended",
    criteria.marketCountry !==
      (baselineRef.current?.marketCountry ?? DEFAULT_MARKET_COUNTRY),
  ].filter(Boolean).length;

  const isDirty =
    (baselineRef.current !== null &&
      serializeCriteria(criteria) !== serializeCriteria(baselineRef.current)) ||
    !!draftQuery.trim();

  const searchSaved = isSearchSaved({
    criteria: { ...criteria, q: draftQuery.trim() },
    q: draftQuery.trim(),
    category: criteria.category,
    minPrice: criteria.minPrice,
    maxPrice: criteria.maxPrice,
    location: criteria.location,
    paymentType: criteria.paymentType,
  });

  const handleSaveSearch = () => {
    const snapshot: SearchCriteria = { ...criteria, q: draftQuery.trim() };
    saveSearch({
      name: snapshot.q.trim() || t(`home.categories.${snapshot.category}`),
      criteria: snapshot,
      q: snapshot.q,
      category: snapshot.category,
      minPrice: snapshot.minPrice,
      maxPrice: snapshot.maxPrice,
      location: snapshot.location,
      paymentType: snapshot.paymentType,
    });
  };

  // Owner order: filters auto-reset on back — no confirm dialog. Hardware
  // back / swipe / header all hit the same path via usePreventRemove + goBack.
  const exitingRef = useRef(false);
  const resetAndLeave = useCallback(
    (leave: () => void) => {
      exitingRef.current = true;
      clearAllFilters();
      leave();
    },
    [clearAllFilters],
  );

  usePreventRemove(isDirty && !exitingRef.current, ({ data }) => {
    resetAndLeave(() => navigation.dispatch(data.action));
  });

  const goBack = () => {
    playSound("tap");
    if (isDirty) {
      resetAndLeave(() => router.back());
      return;
    }
    router.back();
  };

  const rentalTerms = rentalTermsForSearch(criteria.marketCountry);

  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const locationLabel = criteria.location
    ? labelForValue(criteria.location, isRTL) || criteria.location
    : "";

  let overlay: React.ReactNode = null;
  if (viewState === "loading" || viewState === "discover") {
    overlay = (
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </View>
    );
  } else if (viewState === "error") {
    overlay = (
      <View style={styles.emptyState}>
        <Feather name="wifi-off" size={52} color={colors.mutedForeground} />
        <AppText style={[styles.emptyTitle, { color: colors.foreground }]}>
          {t("search.errorTitle")}
        </AppText>
        <AppText style={[styles.emptyText, { color: colors.mutedForeground }]}>
          {t("search.errorHint")}
        </AppText>
        <Pressable
          onPress={retry}
          style={[
            styles.applyBtn,
            { backgroundColor: STAYS_ACCENT, borderRadius: colors.radius },
          ]}
          testID="stays-retry"
        >
          <AppText style={[styles.applyText, { color: "#FFFFFF" }]}>
            {t("search.retry")}
          </AppText>
        </Pressable>
      </View>
    );
  } else if (viewState === "empty") {
    overlay = (
      <View style={styles.emptyState}>
        <Feather name="calendar" size={52} color={colors.mutedForeground} />
        <AppText style={[styles.emptyTitle, { color: colors.foreground }]}>
          {t("search.noResults")}
        </AppText>
        <AppText style={[styles.emptyText, { color: colors.mutedForeground }]}>
          {t("search.noResultsHint")}
        </AppText>
        {activeFilterCount > 0 || draftQuery.trim() ? (
          <Pressable
            onPress={() => {
              playSound("tap");
              clearAllFilters();
            }}
            style={[
              styles.emptyCta,
              {
                flexDirection: rowDir,
                backgroundColor: STAYS_ACCENT,
                borderRadius: colors.radius,
              },
            ]}
            testID="stays-empty-clear"
          >
            <Feather name="refresh-cw" size={16} color="#FFFFFF" />
            <AppText style={[styles.emptyCtaText, { color: "#FFFFFF" }]}>
              {t("search.discover.section.reset")}
            </AppText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => {
            playSound("tap");
            router.push("/listings/create?request=1" as Href);
          }}
          style={[
            styles.emptyCta,
            {
              flexDirection: rowDir,
              backgroundColor: colors.card,
              borderColor: STAYS_ACCENT,
              borderWidth: 1,
              borderRadius: colors.radius,
            },
          ]}
          testID="stays-empty-post-request"
        >
          <Feather name="edit-2" size={16} color={STAYS_ACCENT} />
          <AppText style={[styles.emptyCtaText, { color: STAYS_ACCENT }]}>
            {t("search.emptyPostRequest")}
          </AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── BOOM STAY premium black header — extracted into StaysHomeHeader.
          Owns back/save/search/filter/type-tab bands on a void (#000) canvas.
          Parent keeps all search state; header is purely presentational. ── */}
      <StaysHomeHeader
        searchOpen={searchOpen}
        draftQuery={draftQuery}
        searchSaved={searchSaved}
        activeFilterCount={activeFilterCount}
        activeStayType={activeStayType}
        typeTabs={typeTabs}
        inputRef={inputRef}
        onBack={goBack}
        onSaveSearch={handleSaveSearch}
        onOpenFilters={() => {
          playSound("tap");
          setShowFilters((v) => !v);
        }}
        onOpenSearch={openSearch}
        onCloseSearch={closeSearch}
        onQueryChange={handleQueryChange}
        onSubmitQuery={() => {
          commitQueryNow(draftQuery);
          if (!draftQuery.trim()) closeSearch();
        }}
        onClearQuery={clearQuery}
        onSelectType={selectStayType}
      />
      {/* Autocomplete — anchored directly under the header search pill. */}
      {showSuggestions && suggestions.length > 0 && (
        <View
          style={[
            styles.suggestions,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          {suggestions.map((s, i) => (
            <Pressable
              key={i}
              onPress={() => handleSuggestionTap(s)}
              style={[
                styles.suggestionItem,
                {
                  flexDirection: rowDir,
                  borderBottomColor:
                    i < suggestions.length - 1 ? colors.border : "transparent",
                },
              ]}
            >
              <Ionicons name="search-outline" size={14} color={colors.mutedForeground} />
              <AppText
                style={[
                  styles.suggestionText,
                  { color: colors.foreground, textAlign },
                ]}
              >
                {s}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}

      {/* Controls: sort (W4 / every-section) · stay-type tabs · Wanted.
          Country/currency live in the matrix below — keep this strip short. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Critical: horizontal ScrollView must NOT flex-grow (black-void class).
        style={styles.hScroll}
        contentContainerStyle={[styles.controlsRow, { flexDirection: rowDir }]}
        testID="stays-type-strip"
      >
        {/* Country + currency collapsed into ONE compact icon (owner) — same
            pattern as every section. Currency is display/valuation of the
            market's money, not a search filter. Opens the searchable picker. */}
        <MarketCountryButton
          selected={criteria.marketCountry}
          onPress={() => {
            playSound("tap");
            setMarketPickerOpen(true);
          }}
        />
        <Pressable
          onPress={() => {
            playSound("tap");
            Haptics.selectionAsync();
            const cycle = [
              "recommended",
              "newest",
              "price_asc",
              "price_desc",
            ] as const;
            const next =
              cycle[
                (cycle.indexOf(
                  criteria.sort as (typeof cycle)[number],
                ) +
                  1) %
                  cycle.length
              ];
            update({ sort: next });
          }}
          style={[
            styles.sortChip,
            {
              backgroundColor:
                criteria.sort !== "recommended"
                  ? STAYS_ACCENT
                  : colors.secondary,
              flexDirection: rowDir,
            },
          ]}
          accessibilityLabel={t(`search.sortOptions.${criteria.sort}`)}
          testID="stays-sort-cycle"
        >
          <Feather
            name={
              criteria.sort === "price_asc"
                ? "trending-up"
                : criteria.sort === "price_desc"
                  ? "trending-down"
                  : criteria.sort === "newest"
                    ? "clock"
                    : "list"
            }
            size={14}
            color={
              criteria.sort !== "recommended"
                ? "#FFFFFF"
                : colors.mutedForeground
            }
          />
        </Pressable>
        {/* Type tabs live in StaysHomeHeader (Band D) — only sort + Wanted stay here */}
        <Pressable
          onPress={selectListingModeWanted}
          style={[
            styles.termTab,
            {
              backgroundColor:
                criteria.listingMode === "buy" ? STAYS_ACCENT : colors.card,
              borderColor:
                criteria.listingMode === "buy" ? STAYS_ACCENT : colors.border,
            },
          ]}
          testID="stays-listing-mode-buy"
        >
          <AppText
            style={[
              styles.termTabText,
              {
                color:
                  criteria.listingMode === "buy"
                    ? "#FFFFFF"
                    : colors.foreground,
              },
            ]}
          >
            {t("search.listingModeBuy")}
          </AppText>
        </Pressable>
        {/* 4th chip — Rental term (All types / Daily / Annual …) — same strip */}
        {rentalTerms.length > 0 && (
          <>
            <View style={[styles.chipStripDivider, { backgroundColor: "rgba(255,255,255,0.14)" }]} />
            <RentalTermPickerButton
              terms={rentalTerms}
              selected={criteria.rentalTerm}
              onSelect={(v) =>
                v === null ? update({ rentalTerm: null }) : selectRentalTerm(v)
              }
            />
          </>
        )}
      </ScrollView>

      {viewState === "results" && items.length > 0 ? (
        <AppText
          style={[styles.resultsCount, { color: colors.mutedForeground, textAlign }]}
          testID="stays-results-count"
        >
          {t("search.resultsCount", {
            count: `${items.length}${hasNext ? "+" : ""}`,
          })}
        </AppText>
      ) : null}

      <FilterSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        criteria={criteria}
        shownCategories={["real_estate"]}
        engines={[]}
        quickBrands={[]}
        brandValue={null}
        locationLabel={locationLabel}
        lockCategory
        onSelectCategory={() => {}}
        onSelectEngine={() => {}}
        onBrowseBrand={() => {}}
        onOpenBrandPicker={() => {}}
        onUpdate={(partial) => {
          if (partial.marketCountry) {
            void savePreferredMarketCountry(partial.marketCountry);
          }
          // Stay hard-lock: never accept sale engines / foreign categories.
          update({
            ...partial,
            category: "real_estate",
            engineKey: "rent",
          });
        }}
        onOpenLocationPicker={() => setLocationPickerOpen(true)}
        onClearLocation={() => update({ location: "" })}
        onToggleNearMe={() => void toggleNearMe()}
        onClearAll={clearAllFilters}
        hidePaymentType
        propertyTypeOptions={STAY_TYPE_OPTIONS}
      />

      <View style={styles.resultsArea}>
        <SearchResultsSurface
          items={items}
          onCardPress={handleCardPress}
          onSave={toggleSave}
          isSaved={isSaved}
          onEndReached={loadMore}
          loadingMore={phase === "loadingMore"}
          refreshing={phase === "refreshing"}
          error={phase === "error"}
          onRetry={retry}
          onRefresh={retry}
          overlay={overlay}
          CardComponent={StayCard}
          contentPaddingBottom={insets.bottom + 150}
        />

        {mapMode && inResultsView ? (
          <SearchResultsMap
            items={mappableItems}
            criteria={criteria}
            onOpenListing={handleCardPress}
            onOpenListingId={(id) => router.push(`/listing/${id}?focus=booking`)}
            onSave={toggleSave}
            isSaved={isSaved}
          />
        ) : null}

        {inResultsView ? (
          <View
            style={[styles.mapToggleWrap, { bottom: insets.bottom + 88 }]}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={() => {
                playSound("tap");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMapMode((m) => !m);
              }}
              style={[
                styles.mapToggle,
                { backgroundColor: STAYS_ACCENT, flexDirection: rowDir },
              ]}
              testID="stays-map-toggle"
            >
              <Feather name={mapMode ? "list" : "map"} size={16} color="#FFFFFF" />
              <AppText style={[styles.mapToggleText, { color: "#FFFFFF" }]}>
                {mapMode
                  ? t("search.discover.section.staysList")
                  : hasPagePins
                    ? `${t("search.discover.section.staysMap")} (${mappableItems.length})`
                    : t("search.discover.section.staysMap")}
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </View>

      <LocationPicker
        visible={locationPickerOpen}
        selectedValue={criteria.location}
        onClose={() => setLocationPickerOpen(false)}
        onSelect={(value) => {
          update({ location: value });
          setLocationPickerOpen(false);
        }}
        onClear={() => {
          update({ location: "" });
          setLocationPickerOpen(false);
        }}
      />

      <MarketCountryPicker
        visible={marketPickerOpen}
        selected={criteria.marketCountry}
        onClose={() => setMarketPickerOpen(false)}
        onSelect={(iso) => {
          selectMarketCountry(iso);
          setMarketPickerOpen(false);
        }}
      />

      <MiniAppBottomNav lightened={searchOpen} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  resultsArea: { flex: 1 },

  // ── Compact chip strip (4 items: Country / Sort / Wanted / RentalTerm) ──
  hScroll: {
    flexShrink: 0,
    flexGrow: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  // ── Stays hero (G2: slight trim — same options, less chrome height) ──────
  hero: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: "hidden",
    backgroundColor: "#650E36",
  },
  heroTopRow: { alignItems: "center", gap: 8, marginBottom: 6 },
  heroBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  // Title band shrinks; action buttons stay inside the rose hero (no escape).
  heroTitleWrap: { flex: 1, minWidth: 0 },
  heroTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  heroSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
    marginTop: 1,
  },
  wordmarkRow: {
    alignItems: "center",
    gap: 5,
  },
  wordmarkBoom: {
    width: 64,
    height: 22,
  },
  wordmarkStay: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 2.2,
  },
  poweredRow: {
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  poweredText: {
    fontSize: 9.5,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  poweredLogo: {
    width: 42,
    height: 11,
    opacity: 0.9,
  },
  heroActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    flexShrink: 0,
  },
  heroActionBtnActive: { backgroundColor: "#FFFFFF" },
  filterBadge: {
    position: "absolute",
    top: 3,
    right: 3,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: STAYS_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontSize: 9.5,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  heroSearch: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  heroSearchText: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: "Inter_500Medium",
  },
  heroSearchInput: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF",
    padding: 0,
  },
  // Type tabs; country + currency ride in the compact MarketCountryButton.
  controlsRow: {
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 5,
  },
  sortChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipStripDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    alignSelf: "center",
  },
  heroWatermarkWrap: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  heroWatermark: {
    width: 64,
    height: 22,
    opacity: 0.55,
  },
  termTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  termTabText: { fontSize: 11.5, fontFamily: "Inter_600SemiBold" },
  resultsCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  suggestions: {
    marginHorizontal: 12,
    marginTop: 6,
    borderWidth: 1,
    overflow: "hidden",
  },
  suggestionItem: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  suggestionText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  mapToggleWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  mapToggle: {
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  mapToggleText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyText: { fontSize: 13.5, fontFamily: "Inter_400Regular", textAlign: "center" },
  applyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: "center",
    marginTop: 16,
  },
  applyText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyCta: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 22,
    marginTop: 8,
  },
  emptyCtaText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  // RentalTermPickerButton
  termBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  termSheet: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  termSheetTitle: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  termRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "space-between",
  },
  termRowText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
});
