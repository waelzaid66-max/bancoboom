import type { SearchCriteria } from "@workspace/search-contract";
import {
  buildSearchUrlParams,
  type WebUrlOptions,
} from "@workspace/search-contract";
import { formatCategoryLabelAr, formatCategoryLabelEn } from "./category-labels";
import { formatEngineLabelAr } from "./search-labels";
import type { SiteLocale } from "./hub-config";

function engineFragmentAr(criteria: SearchCriteria): string | null {
  if (criteria.engineKey === "all") return null;
  return formatEngineLabelAr(criteria.engineKey);
}

function engineFragmentEn(criteria: SearchCriteria): string | null {
  if (criteria.engineKey === "all") return null;
  return criteria.engineKey.replaceAll("_", " ");
}

function buildSearchDescription(
  criteria: SearchCriteria,
  locale: SiteLocale,
): string {
  const segments: string[] = [];
  if (locale === "en") {
    const category =
      criteria.category === "all"
        ? "cars, real estate, and industrial"
        : formatCategoryLabelEn(criteria.category);
    segments.push(`${category} results on BANCO`);
    const engine = engineFragmentEn(criteria);
    if (engine) segments.push(engine);
    if (criteria.q.trim()) {
      segments.unshift(`Search for “${criteria.q.trim()}”`);
    }
    if (criteria.location.trim()) {
      segments.push(`in ${criteria.location.trim()}`);
    }
    return segments.join(" — ");
  }

  const category =
    criteria.category === "all"
      ? "سيارات وعقارات وصناعي"
      : formatCategoryLabelAr(criteria.category);
  segments.push(`نتائج ${category} على BANCO`);

  const engine = engineFragmentAr(criteria);
  if (engine) segments.push(engine);

  if (criteria.q.trim()) {
    segments.unshift(`بحث عن «${criteria.q.trim()}»`);
  }

  if (criteria.location.trim()) {
    segments.push(`في ${criteria.location.trim()}`);
  }

  return segments.join(" — ");
}

export function buildSearchMetadata(
  criteria: SearchCriteria,
  options: WebUrlOptions = {},
  locale: SiteLocale = "ar",
): { title: string; description: string; path: string } {
  let title: string;
  if (criteria.q.trim()) {
    title =
      locale === "en"
        ? `Search: ${criteria.q.trim()}`
        : `بحث: ${criteria.q.trim()}`;
  } else if (criteria.category !== "all") {
    title =
      locale === "en"
        ? formatCategoryLabelEn(criteria.category)
        : formatCategoryLabelAr(criteria.category);
    const engine =
      locale === "en" ? engineFragmentEn(criteria) : engineFragmentAr(criteria);
    if (engine) title = `${title} — ${engine}`;
  } else {
    title = locale === "en" ? "Search" : "بحث";
  }

  if (criteria.location.trim()) {
    title =
      locale === "en"
        ? `${title} in ${criteria.location.trim()}`
        : `${title} في ${criteria.location.trim()}`;
  }

  const params = buildSearchUrlParams(criteria, options);
  const qs = params.toString();
  const basePath = locale === "en" ? "/en/search" : "/search";
  const path = qs ? `${basePath}?${qs}` : basePath;

  return {
    title,
    description: buildSearchDescription(criteria, locale),
    path,
  };
}
