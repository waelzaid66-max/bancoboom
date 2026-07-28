import { notFound } from "next/navigation";
import { getListing, getSimilarListings } from "@workspace/api-client-react";
import { ensureApiClientConfigured } from "./api-client-config";
import type { SiteLocale } from "./hub-config";
import { homePathForLocale, localizedPath } from "./hub-config";
import { listingUiCopy } from "./listing-ui-copy";

export async function fetchListingPageData(id: string) {
  ensureApiClientConfigured();

  try {
    const res = await getListing(id);
    const listing = res.data;
    if (!listing) return null;

    let similarItems: Awaited<ReturnType<typeof getSimilarListings>>["data"] = [];
    try {
      const similarRes = await getSimilarListings(id);
      similarItems = similarRes.data ?? [];
    } catch {
      similarItems = [];
    }

    return { listing, similarItems };
  } catch {
    return null;
  }
}

export async function loadListingPageData(id: string) {
  const data = await fetchListingPageData(id);
  if (!data) notFound();
  return data;
}

export function listingBreadcrumbItems(
  listingId: string,
  title: string,
  locale: SiteLocale,
) {
  const copy = listingUiCopy(locale);
  return [
    { name: copy.home, path: homePathForLocale(locale) },
    { name: title, path: localizedPath(`/listing/${listingId}`, locale) },
  ];
}
