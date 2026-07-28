"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useGetFacets,
  type FacetCounts,
  type GetFacetsCategory,
} from "@workspace/api-client-react";
import {
  buildSearchUrlParams,
  facetSectionsForCategory,
  type FacetSectionKey,
  parseSearchCriteriaFromUrl,
} from "@workspace/search-contract";
import type { Category } from "@workspace/taxonomy/categories";
import { applyFacetToCriteria } from "../lib/facet-filters";
import { clampSearchLimit, searchConfig } from "../lib/search-config";
import { formatFacetValue } from "../lib/search-labels";
import { FACET_SECTION_LABELS, searchUiCopy } from "../lib/search-ui-copy";
import { MATERIAL_FACET_OPTIONS } from "../lib/inventory-facets";
import { trackSearchEvent } from "../lib/telemetry";
import { useSearchLocale } from "../lib/use-search-locale";
import type { SiteLocale } from "../lib/hub-config";

type SearchFacetsPanelProps = {
  enabled: boolean;
  /** Browse company from URL criteria — drives which facet sections render. */
  browseCategory: Category;
  category?: GetFacetsCategory;
};

const panelStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "1rem",
  marginTop: "1rem",
};

const chipWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.4rem",
  marginTop: "0.45rem",
};

function facetChipStyle(): React.CSSProperties {
  return {
    border: "1px solid var(--banco-border)",
    borderRadius: 999,
    padding: "0.35rem 0.7rem",
    fontSize: "0.8rem",
    cursor: "pointer",
    background: "transparent",
    color: "var(--banco-fg)",
  };
}

function topEntries(record: Record<string, number>, max = searchConfig.facets.topEntries) {
  return Object.entries(record)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max);
}

function FacetContent({
  data,
  locale,
  browseCategory,
  onPick,
}: {
  data: FacetCounts;
  locale: SiteLocale;
  browseCategory: Category;
  onPick: (section: string, value: string) => void;
}) {
  const sectionLabels = FACET_SECTION_LABELS[locale];
  const allowed = new Set<FacetSectionKey>(facetSectionsForCategory(browseCategory));
  const sections: Array<[FacetSectionKey, Record<string, number> | undefined]> = [
    ["category", data.category],
    ["offer_type", data.offer_type],
    ["payment_plan", data.payment_plan],
    ["property_type", data.property_type],
    ["condition", data.condition],
    ["fuel_type", data.fuel_type],
    ["transmission", data.transmission],
    ["industrial_type", data.industrial_type],
    ["industry", data.industry],
    ["origin_type", data.origin_type],
    ["material", (data as FacetCounts & { material?: Record<string, number> }).material],
  ];

  return (
    <div style={{ display: "grid", gap: "0.85rem", marginTop: "0.75rem" }}>
      {sections.map(([key, record]) => {
        if (!allowed.has(key)) {
          return null;
        }
        let entries: Array<[string, number]> = [];
        if (record) {
          entries = topEntries(record);
        }
        if (key === "material" && entries.length === 0) {
          entries = MATERIAL_FACET_OPTIONS.map((name) => [name, 0]);
        }
        if (entries.length === 0) return null;
        return (
          <div key={key}>
            <strong>{sectionLabels[key] ?? key}</strong>
            <div style={chipWrapStyle}>
              {entries.map(([name, count]) => (
                <button
                  key={`${key}-${name}`}
                  type="button"
                  style={facetChipStyle()}
                  onClick={() => onPick(key, name)}
                >
                  {formatFacetValue(name, locale)}
                  {count > 0 ? ` (${count})` : ""}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SearchFacetsPanelDisabled() {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);

  return (
    <section style={panelStyle}>
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{copy.facetsTitle}</h2>
      <p style={{ margin: "0.5rem 0 0", color: "var(--banco-muted)" }}>{copy.facetsDisabled}</p>
    </section>
  );
}

function SearchFacetsPanelLive({
  browseCategory,
  category,
}: {
  browseCategory: Category;
  category?: GetFacetsCategory;
}) {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useGetFacets(category ? { category } : undefined);
  const data = query.data?.data;

  const onPick = (section: string, value: string) => {
    const criteria = parseSearchCriteriaFromUrl(Object.fromEntries(searchParams.entries()));
    const next = applyFacetToCriteria(criteria, section, value);
    const limit = clampSearchLimit(Number(searchParams.get("limit") ?? searchConfig.limits.default));
    trackSearchEvent("search_facet_click", { section, value });
    router.replace(`${pathname}?${buildSearchUrlParams(next, { limit }).toString()}`);
  };

  return (
    <section style={panelStyle}>
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{copy.facetsTitle}</h2>
      <p style={{ margin: "0.35rem 0 0", color: "var(--banco-muted)", fontSize: "0.85rem" }}>
        {copy.facetsIntro}
      </p>
      {query.isLoading ? (
        <p style={{ margin: "0.5rem 0 0", color: "var(--banco-muted)" }}>{copy.facetsLoading}</p>
      ) : query.isError ? (
        <p style={{ margin: "0.5rem 0 0", color: "#ff6b6b" }}>{copy.facetsError}</p>
      ) : data ? (
        <FacetContent
          data={data}
          locale={locale}
          browseCategory={browseCategory}
          onPick={onPick}
        />
      ) : (
        <p style={{ margin: "0.5rem 0 0", color: "var(--banco-muted)" }}>{copy.facetsEmpty}</p>
      )}
    </section>
  );
}

export function SearchFacetsPanel({
  enabled,
  browseCategory,
  category,
}: SearchFacetsPanelProps) {
  if (!enabled) {
    return <SearchFacetsPanelDisabled />;
  }

  return (
    <SearchFacetsPanelLive browseCategory={browseCategory} category={category} />
  );
}
