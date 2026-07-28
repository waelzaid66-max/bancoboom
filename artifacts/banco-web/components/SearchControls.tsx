"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CLEAR_SECTION_ATTRS,
  DEFAULT_CRITERIA,
  engineByKey,
  parseSearchCriteriaFromUrl,
  buildSearchUrlParams,
  type SearchCriteria,
} from "@workspace/search-contract";
import { accentForCategory } from "@workspace/design-tokens";
import type { Category, IndustrialSubtype } from "@workspace/taxonomy/categories";
import { FACILITIES_TYPES, MATERIALS_TYPES } from "@workspace/taxonomy/categories";
import {
  SearchListingsIndustry,
  SearchListingsOriginType,
} from "@workspace/api-client-react";
import { SearchAutocomplete } from "./SearchAutocomplete";
import { SearchNearMeControl } from "./SearchNearMeControl";
import { SearchCopyUrlButton } from "./SearchCopyUrlButton";
import { trackSearchEvent } from "../lib/telemetry";
import { clampSearchLimit, searchConfig } from "../lib/search-config";
import { searchUiCopy } from "../lib/search-ui-copy";
import {
  formatCategoryLabel,
  formatEngineLabel,
  formatFacetValue,
  formatIndustrialSubtype,
  formatSortLabel,
} from "../lib/search-labels";
import { useSearchLocale } from "../lib/use-search-locale";
import {
  DEFAULT_MARKET_COUNTRY,
  WEB_MARKET_COUNTRIES,
  marketCountryLabel,
  rentalTermsForWebMarket,
  sanitizeRentalTermForWebMarket,
} from "../lib/search-markets";
import {
  useInventoryFacets,
  visibleCategories,
  visibleEngines,
  visibleIndustrialTypes,
  MATERIAL_FACET_OPTIONS,
} from "../lib/inventory-facets";

type SearchControlsProps = {
  liveEnabled: boolean;
};

const boxStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "1rem",
  marginTop: "1rem",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "0.75rem",
  marginTop: "0.75rem",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
};

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 10,
  background: "var(--banco-card)",
  color: "var(--banco-fg)",
  padding: "0.55rem 0.7rem",
  fontSize: "0.9rem",
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 10,
  background: "var(--banco-primary)",
  color: "#fff",
  padding: "0.6rem 0.9rem",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  color: "var(--banco-fg)",
};

const chipWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.4rem",
  marginTop: "0.5rem",
};

function chipStyle(active: boolean, accent = "var(--banco-primary)"): React.CSSProperties {
  return {
    border: `1px solid ${active ? accent : "var(--banco-border)"}`,
    borderRadius: 999,
    padding: "0.35rem 0.7rem",
    fontSize: "0.8rem",
    cursor: "pointer",
    background: active ? accent : "transparent",
    color: active ? "#fff" : "var(--banco-muted)",
  };
}

const INDUSTRY_OPTIONS = Object.values(SearchListingsIndustry);
const ORIGIN_OPTIONS = Object.values(SearchListingsOriginType);
const MATERIAL_OPTIONS = MATERIAL_FACET_OPTIONS;

/**
 * Web search filters — aligned with `@workspace/search-contract` and mobile
 * FilterSheet section-company isolation (CLEAR on category change; materials
 * own origin + material; rent terms only with rent engine).
 */
export function SearchControls({ liveEnabled }: SearchControlsProps) {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const committed = useMemo(
    () => parseSearchCriteriaFromUrl(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );

  const { globalFacets, scopedFacets } = useInventoryFacets(
    committed.category as Category,
  );

  const [draft, setDraft] = useState<SearchCriteria>(committed);

  useEffect(() => {
    setDraft(committed);
  }, [committed]);

  const engines = visibleEngines(draft.category as Category, scopedFacets);

  const industrialSubtypeSource: IndustrialSubtype[] =
    draft.category === "facilities"
      ? FACILITIES_TYPES
      : draft.category === "materials"
        ? MATERIALS_TYPES
        : [];

  const industrialSubtypes = (() => {
    const gated = visibleIndustrialTypes(industrialSubtypeSource, scopedFacets);
    const active = draft.industrialType;
    if (
      active !== "all" &&
      industrialSubtypeSource.length > 0 &&
      !gated.includes(active as IndustrialSubtype)
    ) {
      return [...gated, active as IndustrialSubtype];
    }
    return gated;
  })();

  const selectedEngine = engineByKey(draft.category, draft.engineKey);
  const showRentalChips =
    draft.category === "real_estate" && selectedEngine?.params.offer_type === "rent";

  const showPayment =
    draft.category === "all" ||
    draft.category === "car" ||
    draft.category === "real_estate";

  const sectionAccentColor = accentForCategory(draft.category);

  const showIndustry =
    (draft.category === "facilities" || draft.category === "materials") &&
    !(
      draft.category === "materials" &&
      (draft.industrialType === "all" || draft.industrialType === "raw_material")
    );

  const showOrigin = draft.category === "materials";
  const showMaterial =
    draft.category === "materials" &&
    (draft.industrialType === "all" || draft.industrialType === "raw_material");

  const rentalTermChips = rentalTermsForWebMarket(draft.marketCountry).map(
    (term) => ({
      value: term.value,
      label: locale === "en" ? term.en : term.ar,
    }),
  );

  const categoryOptions = (() => {
    const base: Category[] = ["all", "car", "real_estate", "facilities", "materials"];
    const gated = visibleCategories(base, globalFacets);
    const active = draft.category as Category;
    if (active !== "all" && !gated.includes(active)) {
      return [...gated, active];
    }
    return gated;
  })();
  const sortOptions: SearchCriteria["sort"][] = [
    "recommended",
    "newest",
    "price_asc",
    "price_desc",
    "popular",
  ];
  const fuelOptions = ["petrol", "diesel", "electric", "hybrid", "natural_gas"] as const;
  const transmissionOptions = ["automatic", "manual", "cvt"] as const;

  const selectCategory = (category: SearchCriteria["category"]) => {
    setDraft((s) => {
      const next: SearchCriteria = {
        ...s,
        ...CLEAR_SECTION_ATTRS,
        category,
      };
      if (category === "facilities" || category === "materials") {
        next.paymentType = "any";
      }
      return next;
    });
  };

  const selectEngine = (engineKey: string) => {
    const engine = engineByKey(draft.category, engineKey);
    setDraft((s) => {
      const next: SearchCriteria = { ...s, engineKey };
      if (s.category === "real_estate") {
        const rent = engine?.params.offer_type === "rent";
        next.rentalTerm = rent
          ? sanitizeRentalTermForWebMarket(s.rentalTerm, s.marketCountry)
          : null;
      }
      if (engine?.params.origin_type) {
        next.originType = engine.params.origin_type as SearchCriteria["originType"];
      } else if (s.category === "car" && s.originType) {
        next.originType = null;
      }
      return next;
    });
  };

  const selectMarketCountry = (marketCountry: string) => {
    setDraft((s) => ({
      ...s,
      marketCountry,
      rentalTerm: sanitizeRentalTermForWebMarket(s.rentalTerm, marketCountry),
    }));
  };

  const selectIndustrialType = (industrialType: SearchCriteria["industrialType"]) => {
    setDraft((s) => {
      const next: SearchCriteria = { ...s, industrialType };
      if (
        s.category === "materials" &&
        (industrialType === "all" || industrialType === "raw_material")
      ) {
        next.industry = null;
      }
      if (
        s.category === "materials" &&
        industrialType !== "all" &&
        industrialType !== "raw_material"
      ) {
        next.material = null;
      }
      return next;
    });
  };

  const applyFilters = () => {
    const limit = clampSearchLimit(
      Number(searchParams.get("limit") ?? searchConfig.limits.default),
    );
    const params = buildSearchUrlParams(draft, { limit });
    trackSearchEvent("search_apply", {
      q: draft.q.trim() || null,
      category: draft.category,
      engineKey: draft.engineKey,
      sort: draft.sort,
      location: draft.location.trim() || null,
      liveEnabled,
    });
    router.replace(`${pathname}?${params.toString()}`);
  };

  const resetFilters = () => {
    trackSearchEvent("search_reset", { liveEnabled });
    const preservedCategory = draft.category;
    const next: SearchCriteria = {
      ...DEFAULT_CRITERIA,
      category: preservedCategory,
    };
    const limit = clampSearchLimit(
      Number(searchParams.get("limit") ?? searchConfig.limits.default),
    );
    router.replace(`${pathname}?${buildSearchUrlParams(next, { limit }).toString()}`);
  };

  const activeChip = (active: boolean) => chipStyle(active, sectionAccentColor);
  const primaryBtn: React.CSSProperties = {
    ...buttonStyle,
    background: sectionAccentColor,
    borderColor: sectionAccentColor,
  };

  return (
    <section style={boxStyle}>
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{copy.controlsTitle}</h2>
      <p style={{ margin: "0.5rem 0 0", color: "var(--banco-muted)", lineHeight: 1.6 }}>
        {copy.controlsIntro}
      </p>

      <div style={gridStyle}>
        <label style={fieldStyle}>
          <span>{copy.queryLabel}</span>
          <input
            value={draft.q}
            onChange={(e) => setDraft((s) => ({ ...s, q: e.target.value }))}
            placeholder={copy.queryPlaceholder}
            style={inputStyle}
          />
          <SearchAutocomplete
            enabled={liveEnabled}
            query={draft.q}
            onSelect={(value) => setDraft((s) => ({ ...s, q: value }))}
          />
        </label>

        <label style={fieldStyle}>
          <span>{copy.categoryLabel}</span>
          <select
            value={draft.category}
            onChange={(e) =>
              selectCategory(e.target.value as SearchCriteria["category"])
            }
            style={inputStyle}
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {formatCategoryLabel(category, locale)}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldStyle}>
          <span>{copy.sortLabel}</span>
          <select
            value={draft.sort}
            onChange={(e) =>
              setDraft((s) => ({
                ...s,
                sort: e.target.value as SearchCriteria["sort"],
              }))
            }
            style={inputStyle}
          >
            {sortOptions.map((sort) => (
              <option key={sort} value={sort}>
                {formatSortLabel(sort, locale)}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldStyle}>
          <span>{copy.cityLabel}</span>
          <input
            value={draft.location}
            onChange={(e) => setDraft((s) => ({ ...s, location: e.target.value }))}
            placeholder="cairo"
            style={inputStyle}
          />
        </label>

        <label style={fieldStyle}>
          <span>{copy.marketCountryLabel}</span>
          <select
            value={draft.marketCountry || DEFAULT_MARKET_COUNTRY}
            onChange={(e) => selectMarketCountry(e.target.value)}
            style={inputStyle}
          >
            {WEB_MARKET_COUNTRIES.map((market) => (
              <option key={market.value} value={market.value}>
                {marketCountryLabel(market.value, locale)}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldStyle}>
          <span>{copy.minPriceLabel}</span>
          <input
            value={draft.minPrice}
            onChange={(e) => setDraft((s) => ({ ...s, minPrice: e.target.value }))}
            style={inputStyle}
            inputMode="numeric"
          />
        </label>

        <label style={fieldStyle}>
          <span>{copy.maxPriceLabel}</span>
          <input
            value={draft.maxPrice}
            onChange={(e) => setDraft((s) => ({ ...s, maxPrice: e.target.value }))}
            style={inputStyle}
            inputMode="numeric"
          />
        </label>

        <label style={fieldStyle}>
          <span>{copy.limitLabel}</span>
          <input
            defaultValue={searchParams.get("limit") ?? String(searchConfig.limits.default)}
            onBlur={(e) => {
              const limit = clampSearchLimit(Number(e.target.value));
              const params = new URLSearchParams(searchParams.toString());
              params.set("limit", String(limit));
              router.replace(`${pathname}?${params.toString()}`);
            }}
            style={inputStyle}
            inputMode="numeric"
          />
        </label>
      </div>

      {draft.category === "car" ? (
        <div style={{ ...gridStyle, marginTop: "0.75rem" }}>
          <label style={fieldStyle}>
            <span>{copy.brandLabel}</span>
            <input
              value={draft.brand ?? ""}
              onChange={(e) =>
                setDraft((s) => ({ ...s, brand: e.target.value.trim() || null }))
              }
              placeholder="Toyota"
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span>{copy.modelLabel}</span>
            <input
              value={draft.model ?? ""}
              onChange={(e) =>
                setDraft((s) => ({ ...s, model: e.target.value.trim() || null }))
              }
              placeholder="Corolla"
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span>{copy.minYearLabel}</span>
            <input
              value={draft.minYear}
              onChange={(e) => setDraft((s) => ({ ...s, minYear: e.target.value }))}
              style={inputStyle}
              inputMode="numeric"
            />
          </label>
          <label style={fieldStyle}>
            <span>{copy.maxYearLabel}</span>
            <input
              value={draft.maxYear}
              onChange={(e) => setDraft((s) => ({ ...s, maxYear: e.target.value }))}
              style={inputStyle}
              inputMode="numeric"
            />
          </label>
          <label style={fieldStyle}>
            <span>{copy.fuelLabel}</span>
            <select
              value={draft.fuelType ?? ""}
              onChange={(e) =>
                setDraft((s) => ({
                  ...s,
                  fuelType: (e.target.value || null) as SearchCriteria["fuelType"],
                }))
              }
              style={inputStyle}
            >
              <option value="">{copy.anyOption}</option>
              {fuelOptions.map((fuel) => (
                <option key={fuel} value={fuel}>
                  {formatFacetValue(fuel, locale)}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            <span>{copy.transmissionLabel}</span>
            <select
              value={draft.transmission ?? ""}
              onChange={(e) =>
                setDraft((s) => ({
                  ...s,
                  transmission: (e.target.value ||
                    null) as SearchCriteria["transmission"],
                }))
              }
              style={inputStyle}
            >
              <option value="">{copy.anyOption}</option>
              {transmissionOptions.map((transmission) => (
                <option key={transmission} value={transmission}>
                  {formatFacetValue(transmission, locale)}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {industrialSubtypes.length > 0 ? (
        <div style={{ marginTop: "0.75rem" }}>
          <span style={{ color: "var(--banco-muted)", fontSize: "0.9rem" }}>
            {copy.industrialTypeLabel}
          </span>
          <div style={chipWrapStyle}>
            <button
              type="button"
              style={activeChip(draft.industrialType === "all")}
              onClick={() => selectIndustrialType("all")}
            >
              {copy.allChip}
            </button>
            {industrialSubtypes.map((subtype) => (
              <button
                key={subtype}
                type="button"
                style={activeChip(draft.industrialType === subtype)}
                onClick={() => selectIndustrialType(subtype)}
              >
                {formatIndustrialSubtype(subtype, locale)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showIndustry ? (
        <div style={{ marginTop: "0.75rem" }}>
          <span style={{ color: "var(--banco-muted)", fontSize: "0.9rem" }}>
            {copy.industryLabel}
          </span>
          <div style={chipWrapStyle}>
            {INDUSTRY_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                style={activeChip(draft.industry === value)}
                onClick={() =>
                  setDraft((s) => ({
                    ...s,
                    industry: s.industry === value ? null : value,
                  }))
                }
              >
                {formatFacetValue(value, locale)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showMaterial ? (
        <div style={{ marginTop: "0.75rem" }}>
          <span style={{ color: "var(--banco-muted)", fontSize: "0.9rem" }}>
            {copy.materialLabel}
          </span>
          <div style={chipWrapStyle}>
            {MATERIAL_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                style={activeChip(draft.material === value)}
                onClick={() =>
                  setDraft((s) => ({
                    ...s,
                    material: s.material === value ? null : value,
                  }))
                }
              >
                {formatFacetValue(value, locale)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showOrigin ? (
        <div style={{ marginTop: "0.75rem" }}>
          <span style={{ color: "var(--banco-muted)", fontSize: "0.9rem" }}>
            {copy.originLabel}
          </span>
          <div style={chipWrapStyle}>
            {ORIGIN_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                style={activeChip(draft.originType === value)}
                onClick={() =>
                  setDraft((s) => ({
                    ...s,
                    originType: s.originType === value ? null : value,
                  }))
                }
              >
                {formatFacetValue(value, locale)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: "0.75rem" }}>
        <span style={{ color: "var(--banco-muted)", fontSize: "0.9rem" }}>
          {copy.listingModeLabel}
        </span>
        <div style={chipWrapStyle}>
          {(["all", "sale", "buy"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              style={activeChip(draft.listingMode === mode)}
              onClick={() => setDraft((s) => ({ ...s, listingMode: mode }))}
            >
              {mode === "all"
                ? copy.listingModeAll
                : mode === "sale"
                  ? copy.listingModeSale
                  : copy.listingModeBuy}
            </button>
          ))}
        </div>
      </div>

      {showPayment ? (
      <div style={{ marginTop: "0.75rem" }}>
        <span style={{ color: "var(--banco-muted)", fontSize: "0.9rem" }}>
          {copy.paymentLabel}
        </span>
        <div style={chipWrapStyle}>
          <button
            type="button"
            style={activeChip(draft.paymentType === "any")}
            onClick={() => setDraft((s) => ({ ...s, paymentType: "any" }))}
          >
            {copy.anyOption}
          </button>
          <button
            type="button"
            style={activeChip(draft.paymentType === "installment")}
            onClick={() => setDraft((s) => ({ ...s, paymentType: "installment" }))}
          >
            {copy.installmentChip}
          </button>
        </div>
      </div>
      ) : null}

      {engines.length > 1 ? (
        <div style={{ marginTop: "0.75rem" }}>
          <span style={{ color: "var(--banco-muted)", fontSize: "0.9rem" }}>
            {copy.engineLabel}
          </span>
          <div style={chipWrapStyle}>
            {engines.map((engine) => (
              <button
                key={engine.key}
                type="button"
                style={activeChip(draft.engineKey === engine.key)}
                onClick={() => selectEngine(engine.key)}
              >
                {formatEngineLabel(engine.key, locale)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showRentalChips ? (
        <div style={{ marginTop: "0.75rem" }}>
          <span style={{ color: "var(--banco-muted)", fontSize: "0.9rem" }}>
            {copy.rentalTermLabel}
          </span>
          <div style={chipWrapStyle}>
            {rentalTermChips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                style={activeChip(draft.rentalTerm === chip.value)}
                onClick={() =>
                  setDraft((s) => ({
                    ...s,
                    engineKey: "rent",
                    rentalTerm: s.rentalTerm === chip.value ? null : chip.value,
                  }))
                }
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.9rem", flexWrap: "wrap" }}>
        <button type="button" onClick={applyFilters} style={primaryBtn}>
          {copy.apply}
        </button>
        <button type="button" onClick={resetFilters} style={secondaryButtonStyle}>
          {copy.reset}
        </button>
        <SearchCopyUrlButton />
        <SearchNearMeControl />
      </div>
    </section>
  );
}
